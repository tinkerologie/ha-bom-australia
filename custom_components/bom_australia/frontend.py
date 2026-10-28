"""Serve the dashboard card bundle and keep its Lovelace resource registration tidy.

The integration owns one Lovelace resource, ``/bom_australia/bom-australia-cards.js``,
versioned with the integration version and a content hash so browsers pick up new
cards. In YAML resource mode the bundle is added as an extra JS module instead. The
resource is removed when the last config entry is deleted.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any, Final

from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.resources import ResourceStorageCollection
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.start import async_at_started
from homeassistant.loader import async_get_integration
from homeassistant.util.hass_dict import HassKey

from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

FRONTEND_URL_BASE: Final = f"/{DOMAIN}"
FRONTEND_PATH: Final = Path(__file__).parent / "frontend"
CARD_FILE: Final = "bom-australia-cards.js"
CARD_URL: Final = f"{FRONTEND_URL_BASE}/{CARD_FILE}"

_REGISTERED: HassKey[bool] = HassKey(f"{DOMAIN}_frontend_registered")
_STATIC_REGISTERED: HassKey[bool] = HassKey(f"{DOMAIN}_frontend_static_registered")
_LOCK: HassKey[asyncio.Lock] = HassKey(f"{DOMAIN}_frontend_lock")
_EXTRA_JS_URL: HassKey[str] = HassKey(f"{DOMAIN}_frontend_extra_js_url")


def _bundle_digest(path: Path) -> str | None:
    """Return a short content hash of the bundle, or None when it is missing."""
    if not path.is_file():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


def _lock(hass: HomeAssistant) -> asyncio.Lock:
    if (lock := hass.data.get(_LOCK)) is None:
        lock = hass.data[_LOCK] = asyncio.Lock()
    return lock


def _storage_resources(hass: HomeAssistant) -> ResourceStorageCollection | None:
    lovelace = hass.data.get(LOVELACE_DATA)
    resources = lovelace.resources if lovelace is not None else None
    return resources if isinstance(resources, ResourceStorageCollection) else None


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Serve the card bundle and register it as a Lovelace resource (idempotent)."""
    if not {"http", "frontend"} <= hass.config.components:
        if hass.is_running:
            _LOGGER.debug("http/frontend not loaded; card registration skipped")
            return

        async def _register_on_start(_: HomeAssistant) -> None:
            # The entry may have been removed while Home Assistant was starting.
            if hass.config_entries.async_entries(DOMAIN):
                await async_register_frontend(hass)

        async_at_started(hass, _register_on_start)
        return

    async with _lock(hass):
        if hass.data.get(_REGISTERED):
            return
        digest = await hass.async_add_executor_job(
            _bundle_digest, FRONTEND_PATH / CARD_FILE
        )
        if digest is None:
            _LOGGER.warning("Dashboard card bundle %s is missing", CARD_FILE)
            return
        try:
            if not hass.data.get(_STATIC_REGISTERED):
                await hass.http.async_register_static_paths(
                    [
                        StaticPathConfig(
                            FRONTEND_URL_BASE, str(FRONTEND_PATH), cache_headers=False
                        )
                    ]
                )
                hass.data[_STATIC_REGISTERED] = True
            integration = await async_get_integration(hass, DOMAIN)
            versioned_url = f"{CARD_URL}?v={integration.version}-{digest}"
            await _async_register_resource(hass, versioned_url)
        except HomeAssistantError:
            _LOGGER.exception("Unable to register the dashboard cards")
        else:
            hass.data[_REGISTERED] = True


async def _async_register_resource(hass: HomeAssistant, versioned_url: str) -> None:
    """Create or update the one storage resource, or add an extra JS URL in YAML mode."""
    if (resources := _storage_resources(hass)) is None:
        add_extra_js_url(hass, versioned_url)
        hass.data[_EXTRA_JS_URL] = versioned_url
        return

    await resources.async_get_info()
    existing = [
        item
        for item in resources.async_items()
        if item["url"].partition("?")[0] == CARD_URL
    ]
    if not existing:
        await resources.async_create_item({"url": versioned_url, "res_type": "module"})
        return
    first, *duplicates = existing
    if _needs_update(first, versioned_url):
        await resources.async_update_item(
            first["id"], {"url": versioned_url, "res_type": "module"}
        )
    for item in duplicates:
        await resources.async_delete_item(item["id"])


def _needs_update(item: dict[str, Any], versioned_url: str) -> bool:
    return (
        item.get("url") != versioned_url
        or (item.get("res_type") or item.get("type")) != "module"
    )


async def async_unregister_frontend(hass: HomeAssistant) -> None:
    """Remove the card resource (called when the last config entry is removed)."""
    async with _lock(hass):
        hass.data.pop(_REGISTERED, None)
        if (url := hass.data.pop(_EXTRA_JS_URL, None)) is not None:
            remove_extra_js_url(hass, url)
        if (resources := _storage_resources(hass)) is None:
            return
        try:
            await resources.async_get_info()
            for item in list(resources.async_items()):
                if item["url"].partition("?")[0] == CARD_URL:
                    await resources.async_delete_item(item["id"])
        except HomeAssistantError:
            _LOGGER.exception("Unable to remove the dashboard card resource")

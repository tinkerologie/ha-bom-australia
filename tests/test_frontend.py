"""Tests for the dashboard card resource registration."""

from __future__ import annotations

from collections.abc import Generator
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.bom_australia import frontend
from custom_components.bom_australia.const import DOMAIN
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.resources import ResourceStorageCollection
from homeassistant.core import CoreState, HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .conftest import setup_integration

CARD_URL = "/bom_australia/bom-australia-cards.js"


def _resources(items: list[dict[str, Any]]) -> MagicMock:
    resources = MagicMock(spec=ResourceStorageCollection)
    resources.items = items
    resources.async_get_info = AsyncMock()
    resources.async_items = MagicMock(side_effect=lambda: list(resources.items))

    async def create(data: dict[str, Any]) -> None:
        resources.items.append(
            {"id": "new", "url": data["url"], "type": data["res_type"]}
        )

    resources.async_create_item = AsyncMock(side_effect=create)
    resources.async_update_item = AsyncMock()
    resources.async_delete_item = AsyncMock()
    return resources


@pytest.fixture
def web(hass: HomeAssistant) -> Generator[MagicMock]:
    """Pretend http and frontend are loaded."""
    hass.config.components.update({"http", "frontend"})
    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    with (
        patch.object(frontend, "add_extra_js_url") as add,
        patch.object(frontend, "remove_extra_js_url") as remove,
    ):
        yield SimpleNamespace(add=add, remove=remove)


def _use(hass: HomeAssistant, resources: MagicMock | None) -> None:
    hass.data[LOVELACE_DATA] = SimpleNamespace(resources=resources)


async def test_creates_resource(hass: HomeAssistant, web: SimpleNamespace) -> None:
    resources = _resources([])
    _use(hass, resources)
    await frontend.async_register_frontend(hass)

    hass.http.async_register_static_paths.assert_awaited_once()
    (created,) = resources.async_create_item.await_args.args
    assert created["res_type"] == "module"
    assert created["url"].startswith(f"{CARD_URL}?v=2026.10.0-")

    # Registration is idempotent.
    await frontend.async_register_frontend(hass)
    assert resources.async_create_item.await_count == 1
    hass.http.async_register_static_paths.assert_awaited_once()


async def test_updates_stale_and_removes_duplicates(
    hass: HomeAssistant, web: SimpleNamespace
) -> None:
    resources = _resources(
        [
            {"id": "a", "url": f"{CARD_URL}?v=old", "type": "module"},
            {"id": "b", "url": f"{CARD_URL}?v=older", "type": "module"},
            {"id": "c", "url": "/other/card.js", "type": "module"},
        ]
    )
    _use(hass, resources)
    await frontend.async_register_frontend(hass)

    resources.async_create_item.assert_not_awaited()
    item_id, data = resources.async_update_item.await_args.args
    assert item_id == "a"
    assert data["url"].startswith(f"{CARD_URL}?v=2026.10.0-")
    resources.async_delete_item.assert_awaited_once_with("b")


async def test_current_resource_left_alone(
    hass: HomeAssistant, web: SimpleNamespace
) -> None:
    digest = frontend._bundle_digest(frontend.FRONTEND_PATH / frontend.CARD_FILE)
    url = f"{CARD_URL}?v=2026.10.0-{digest}"
    resources = _resources([{"id": "a", "url": url, "type": "module"}])
    _use(hass, resources)
    await frontend.async_register_frontend(hass)
    resources.async_update_item.assert_not_awaited()
    resources.async_create_item.assert_not_awaited()


async def test_yaml_mode_uses_extra_js_url(
    hass: HomeAssistant, web: SimpleNamespace
) -> None:
    _use(hass, None)
    await frontend.async_register_frontend(hass)
    (added,) = web.add.call_args.args[1:]
    assert added.startswith(f"{CARD_URL}?v=")

    await frontend.async_unregister_frontend(hass)
    web.remove.assert_called_once_with(hass, added)


async def test_missing_bundle(
    hass: HomeAssistant, web: SimpleNamespace, tmp_path: Any
) -> None:
    resources = _resources([])
    _use(hass, resources)
    with patch.object(frontend, "FRONTEND_PATH", tmp_path):
        await frontend.async_register_frontend(hass)
    resources.async_create_item.assert_not_awaited()
    hass.http.async_register_static_paths.assert_not_awaited()


async def test_registration_error_is_logged(
    hass: HomeAssistant, web: SimpleNamespace, caplog: pytest.LogCaptureFixture
) -> None:
    resources = _resources([])
    resources.async_create_item.side_effect = HomeAssistantError("boom")
    _use(hass, resources)
    await frontend.async_register_frontend(hass)
    assert "Unable to register the dashboard cards" in caplog.text
    assert not hass.data.get(frontend._REGISTERED)


async def test_skipped_without_frontend_when_running(hass: HomeAssistant) -> None:
    assert "frontend" not in hass.config.components
    resources = _resources([])
    _use(hass, resources)
    await frontend.async_register_frontend(hass)
    resources.async_create_item.assert_not_awaited()


async def test_deferred_until_started(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    hass.set_state(CoreState.not_running)
    assert "frontend" not in hass.config.components
    mock_config_entry.add_to_hass(hass)
    with patch.object(
        frontend, "async_register_frontend", wraps=frontend.async_register_frontend
    ) as register:
        await frontend.async_register_frontend(hass)
        hass.config.components.update({"http", "frontend"})
        hass.http = MagicMock(async_register_static_paths=AsyncMock())
        _use(hass, _resources([]))
        await hass.async_start()
        await hass.async_block_till_done()
    assert register.await_count == 2
    assert hass.data.get(frontend._REGISTERED)


async def test_unregister_removes_resource(
    hass: HomeAssistant, web: SimpleNamespace
) -> None:
    resources = _resources(
        [
            {"id": "a", "url": f"{CARD_URL}?v=1", "type": "module"},
            {"id": "c", "url": "/other/card.js", "type": "module"},
        ]
    )
    _use(hass, resources)
    await frontend.async_unregister_frontend(hass)
    resources.async_delete_item.assert_awaited_once_with("a")


async def test_unregister_error_is_logged(
    hass: HomeAssistant, web: SimpleNamespace, caplog: pytest.LogCaptureFixture
) -> None:
    resources = _resources([{"id": "a", "url": CARD_URL, "type": "module"}])
    resources.async_delete_item.side_effect = HomeAssistantError("boom")
    _use(hass, resources)
    await frontend.async_unregister_frontend(hass)
    assert "Unable to remove the dashboard card resource" in caplog.text


async def test_removing_last_entry_unregisters(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    await setup_integration(hass, mock_config_entry)
    other = MockConfigEntry(
        domain=DOMAIN, unique_id="QLD_PT021", data=mock_config_entry.data
    )
    other.add_to_hass(hass)
    with patch(
        "custom_components.bom_australia.async_unregister_frontend"
    ) as unregister:
        await hass.config_entries.async_remove(mock_config_entry.entry_id)
        unregister.assert_not_called()
        await hass.config_entries.async_remove(other.entry_id)
        unregister.assert_awaited_once()

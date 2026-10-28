"""Base entity for the Bureau of Meteorology integration."""

from __future__ import annotations

from typing import Any

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import ATTRIBUTION, CONFIGURATION_URL, DOMAIN, MANUFACTURER
from .coordinator import BomConfigEntry, BomCoordinator


def device_info(entry: BomConfigEntry) -> DeviceInfo:
    """Return the service device shared by all entities of an entry."""
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name=entry.title,
        manufacturer=MANUFACTURER,
        model="Town forecast",
        entry_type=DeviceEntryType.SERVICE,
        configuration_url=CONFIGURATION_URL,
    )


class BomEntity(CoordinatorEntity[BomCoordinator[Any]]):
    """Base class for Bureau of Meteorology entities."""

    _attr_attribution = ATTRIBUTION
    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: BomCoordinator[Any],
        entry: BomConfigEntry,
        unique_id: str,
    ) -> None:
        """Initialise the entity."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.unique_id}_{unique_id}"
        self._attr_device_info = device_info(entry)

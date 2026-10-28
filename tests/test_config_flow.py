"""Tests for the config flow."""

from __future__ import annotations

from unittest.mock import MagicMock

from bom_weather_api import BomConnectionError, BomNotFoundError
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.bom_australia.const import (
    CONF_FORECAST_DAYS,
    CONF_LOCATION,
    CONF_LOCATION_AAC,
    CONF_STATION_ID,
    CONF_STATION_NAME,
    DOMAIN,
)
from homeassistant.config_entries import SOURCE_USER
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from .conftest import ENTRY_DATA, setup_integration

HOME = {CONF_LOCATION: {CONF_LATITUDE: -27.47, CONF_LONGITUDE: 153.02}}


async def _start(hass: HomeAssistant) -> dict:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    return await hass.config_entries.flow.async_configure(result["flow_id"], HOME)


async def test_full_flow(hass: HomeAssistant, mock_client: MagicMock) -> None:
    result = await _start(hass)
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "town"
    options = result["data_schema"].schema[CONF_LOCATION_AAC].config["options"]
    assert options[0] == {"value": "QLD_PT001", "label": "Brisbane, QLD (2.2 km)"}

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_LOCATION_AAC: "QLD_PT001"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "station"
    assert result["description_placeholders"] == {"location": "Brisbane"}
    options = result["data_schema"].schema[CONF_STATION_ID].config["options"]
    assert options[0] == {"value": "040913", "label": "Brisbane (0 km)"}

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_STATION_ID: "040913"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Brisbane"
    assert result["data"] == ENTRY_DATA
    assert result["options"] == {CONF_FORECAST_DAYS: 2}
    assert result["result"].unique_id == "QLD_PT001"


async def test_locations_cannot_connect(
    hass: HomeAssistant, mock_client: MagicMock
) -> None:
    mock_client.get_forecast_locations.side_effect = BomConnectionError
    result = await _start(hass)
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {"base": "cannot_connect"}

    mock_client.get_forecast_locations.side_effect = None
    result = await hass.config_entries.flow.async_configure(result["flow_id"], HOME)
    assert result["step_id"] == "town"


async def test_stations_cannot_connect(
    hass: HomeAssistant, mock_client: MagicMock
) -> None:
    result = await _start(hass)
    mock_client.get_stations.side_effect = BomConnectionError
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_LOCATION_AAC: "QLD_PT001"}
    )
    assert result["step_id"] == "town"
    assert result["errors"] == {"base": "cannot_connect"}


async def test_no_stations(hass: HomeAssistant, mock_client: MagicMock) -> None:
    mock_client.get_stations.return_value = []
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_LOCATION_AAC: "QLD_PT001"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "no_stations"


@pytest.mark.parametrize(
    ("error", "key"),
    [
        (BomNotFoundError("gone", status=404), "station_unavailable"),
        (BomConnectionError, "cannot_connect"),
    ],
)
async def test_station_errors(
    hass: HomeAssistant, mock_client: MagicMock, error: Exception, key: str
) -> None:
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_LOCATION_AAC: "QLD_PT001"}
    )
    side_effect = mock_client.get_observation.side_effect
    mock_client.get_observation.side_effect = error
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_STATION_ID: "040913"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": key}

    mock_client.get_observation.side_effect = side_effect
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_STATION_ID: "040211"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"][CONF_STATION_NAME] == "Archerfield"


async def test_already_configured(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    mock_config_entry.add_to_hass(hass)
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_LOCATION_AAC: "QLD_PT001"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_reconfigure(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    await setup_integration(hass, mock_config_entry)
    result = await mock_config_entry.start_reconfigure_flow(hass)
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "reconfigure"

    side_effect = mock_client.get_observation.side_effect
    mock_client.get_observation.side_effect = BomNotFoundError("gone", status=404)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_STATION_ID: "040842"}
    )
    assert result["errors"] == {"base": "station_unavailable"}

    mock_client.get_observation.side_effect = side_effect
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_STATION_ID: "040842"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reconfigure_successful"
    assert mock_config_entry.data[CONF_STATION_ID] == "040842"
    assert mock_config_entry.data[CONF_STATION_NAME] == "Brisbane Airport"


@pytest.mark.parametrize(
    ("stations", "reason"),
    [(BomConnectionError, "cannot_connect"), ([], "no_stations")],
)
async def test_reconfigure_aborts(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    stations: object,
    reason: str,
) -> None:
    await setup_integration(hass, mock_config_entry)
    if isinstance(stations, list):
        mock_client.get_stations.return_value = stations
    else:
        mock_client.get_stations.side_effect = stations
    result = await mock_config_entry.start_reconfigure_flow(hass)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == reason


async def test_options_flow(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    await setup_integration(hass, mock_config_entry)
    result = await hass.config_entries.options.async_init(mock_config_entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "init"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_FORECAST_DAYS: 1.0}
    )
    await hass.async_block_till_done()
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert mock_config_entry.options == {CONF_FORECAST_DAYS: 1}
    assert hass.states.get("sensor.brisbane_max_temperature_day_0")
    assert hass.states.get("sensor.brisbane_max_temperature_day_1") is None

"""Tests for the optional Open-Meteo secondary forecast."""

from __future__ import annotations

import asyncio
import contextlib
from datetime import UTC, date, timedelta
import itertools
import json
from typing import Any
from unittest.mock import MagicMock, patch

from bom_weather_api import BomConnectionError
import pytest
from pytest_homeassistant.common import MockConfigEntry, async_fire_time_changed
from pytest_homeassistant.test_util.aiohttp import AiohttpClientMocker
from syrupy.assertion import SnapshotAssertion

from custom_components.bom_australia.const import (
    ATTRIBUTION,
    ATTRIBUTION_OPEN_METEO,
    CONF_FORECAST_DAYS,
    CONF_OPEN_METEO,
    DOMAIN,
    OPEN_METEO_FORECAST_DAYS,
    OPEN_METEO_MODEL,
)
from custom_components.bom_australia.weather import map_wmo_condition
from homeassistant.components.weather import (
    ATTR_CONDITION_CLEAR_NIGHT,
    ATTR_CONDITION_LIGHTNING_RAINY,
    ATTR_CONDITION_POURING,
    ATTR_CONDITION_SUNNY,
    DOMAIN as WEATHER_DOMAIN,
    SERVICE_GET_FORECASTS,
)
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import ATTR_ATTRIBUTION, Platform
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .conftest import ENTRY_DATA, fixture_bytes, setup_integration

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
JSON = {"Content-Type": "application/json"}


@pytest.fixture(autouse=True)
def weather_only() -> None:
    """Only set up the weather platform."""
    with patch("custom_components.bom_australia.PLATFORMS", [Platform.WEATHER]):
        yield


@pytest.fixture
def open_meteo_entry() -> MockConfigEntry:
    """Return a config entry with Open-Meteo enabled."""
    return MockConfigEntry(
        domain=DOMAIN,
        entry_id="01JBOMTESTENTRY0000000000",
        title="Brisbane",
        unique_id="QLD_PT001",
        data=ENTRY_DATA,
        options={CONF_FORECAST_DAYS: 2, CONF_OPEN_METEO: True},
    )


@pytest.fixture
def open_meteo(aioclient_mock: AiohttpClientMocker) -> AiohttpClientMocker:
    """Serve the captured Open-Meteo forecast."""
    aioclient_mock.get(
        OPEN_METEO_URL, text=fixture_bytes("open_meteo.json").decode(), headers=JSON
    )
    return aioclient_mock


async def _forecast(hass: HomeAssistant, forecast_type: str) -> list[dict[str, Any]]:
    response = await hass.services.async_call(
        WEATHER_DOMAIN,
        SERVICE_GET_FORECASTS,
        {"entity_id": "weather.brisbane", "type": forecast_type},
        blocking=True,
        return_response=True,
    )
    return response["weather.brisbane"]["forecast"]


async def test_disabled_by_default(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """Without the option, Open-Meteo is never contacted."""
    await setup_integration(hass, mock_config_entry)
    assert aioclient_mock.call_count == 0
    assert mock_config_entry.runtime_data.open_meteo is None
    state = hass.states.get("weather.brisbane")
    assert state.attributes[ATTR_ATTRIBUTION] == ATTRIBUTION
    assert len(await _forecast(hass, "daily")) == 7


async def test_request(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
) -> None:
    """The pinned model is requested in the location's timezone."""
    await setup_integration(hass, open_meteo_entry)
    assert open_meteo.call_count == 1
    url = open_meteo.mock_calls[0][1]
    assert url.query["models"] == OPEN_METEO_MODEL
    assert url.query["timezone"] == "Australia/Brisbane"
    assert url.query["forecast_days"] == str(OPEN_METEO_FORECAST_DAYS)
    assert url.query["latitude"] == str(ENTRY_DATA["latitude"])
    state = hass.states.get("weather.brisbane")
    assert state.attributes[ATTR_ATTRIBUTION] == ATTRIBUTION_OPEN_METEO


async def test_daily_forecast_extended(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
    snapshot: SnapshotAssertion,
) -> None:
    """BoM's seven days come first; Open-Meteo adds the days after them."""
    await setup_integration(hass, open_meteo_entry)
    forecast = await _forecast(hass, "daily")

    bom_days = mock_client.get_daily_forecast.return_value.days
    for day, bom in zip(forecast, bom_days, strict=False):
        assert day["datetime"].startswith(bom.date.isoformat())
        assert day["temperature"] == bom.temp_max
    dates = [date.fromisoformat(day["datetime"][:10]) for day in forecast]
    assert dates == sorted(dates)
    assert len(dates) == len(set(dates))
    assert dates[len(bom_days)] > bom_days[-1].date
    assert dates[-1] == date(2026, 11, 11)
    assert forecast[len(bom_days) :] == snapshot


async def test_hourly_prefers_bom(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
) -> None:
    """BoM's hourly forecast is used while it is available."""
    await setup_integration(hass, open_meteo_entry)
    hourly = await _forecast(hass, "hourly")
    bom = mock_client.get_hourly_forecast.return_value.hours
    assert hourly[0]["datetime"] in {hour.time.isoformat() for hour in bom}


async def test_hourly_falls_back_to_open_meteo(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
    snapshot: SnapshotAssertion,
) -> None:
    """Open-Meteo provides the hourly forecast when the BoM app API fails."""
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    await setup_integration(hass, open_meteo_entry)
    assert open_meteo_entry.state is ConfigEntryState.LOADED
    hourly = await _forecast(hass, "hourly")
    # From the hour before "now" (2026-10-28 12:00 AEST) to the end of day 15.
    assert hourly[0]["datetime"] == "2026-10-28T12:00:00+10:00"
    assert hourly[-1]["datetime"] == "2026-11-11T23:00:00+10:00"
    assert hourly[:3] == snapshot


async def test_no_hourly_without_either_source(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """Without BoM or Open-Meteo hourly data there is no hourly forecast."""
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    aioclient_mock.get(OPEN_METEO_URL, status=500, text="server error")
    await setup_integration(hass, open_meteo_entry)
    assert open_meteo_entry.state is ConfigEntryState.LOADED
    assert await _forecast(hass, "hourly") == []
    # The daily forecast keeps BoM's seven days.
    assert len(await _forecast(hass, "daily")) == 7


@pytest.mark.parametrize(
    ("status", "headers", "message", "retry_after"),
    [
        (500, {}, "Error fetching the Open-Meteo forecast", None),
        (429, {"Retry-After": "120"}, "Open-Meteo is rate limiting", 120),
        (429, {}, "Open-Meteo is rate limiting", None),
    ],
)
@pytest.mark.usefixtures("mock_client")
async def test_open_meteo_errors(
    hass: HomeAssistant,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    *,
    status: int,
    headers: dict[str, str],
    message: str,
    retry_after: int | None,
) -> None:
    """Open-Meteo failures leave the integration and BoM data working."""
    aioclient_mock.get(
        OPEN_METEO_URL,
        status=status,
        headers={**JSON, **headers},
        text=json.dumps({"error": True, "reason": "nope"}),
    )
    await setup_integration(hass, open_meteo_entry)
    assert open_meteo_entry.state is ConfigEntryState.LOADED
    coordinator = open_meteo_entry.runtime_data.open_meteo
    assert coordinator is not None
    assert not coordinator.last_update_success
    assert message.lower() in str(coordinator.last_exception).lower()
    assert getattr(coordinator.last_exception, "retry_after", None) == retry_after
    assert hass.states.get("weather.brisbane").state == "rainy"


async def test_unknown_timezone(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
) -> None:
    """A timezone Home Assistant does not know is reported as a failure."""
    with patch(
        "custom_components.bom_australia.coordinator.dt_util.async_get_time_zone",
        return_value=None,
    ):
        await setup_integration(hass, open_meteo_entry)
    coordinator = open_meteo_entry.runtime_data.open_meteo
    assert not coordinator.last_update_success
    assert "unknown timezone" in str(coordinator.last_exception)


async def test_missing_series(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """Responses without hourly data or with short series are tolerated."""
    data = json.loads(fixture_bytes("open_meteo.json"))
    del data["hourly"], data["hourly_units"]
    data["daily"]["uv_index_max"] = data["daily"]["uv_index_max"][:2]
    aioclient_mock.get(OPEN_METEO_URL, text=json.dumps(data), headers=JSON)
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    await setup_integration(hass, open_meteo_entry)
    assert await _forecast(hass, "hourly") == []
    daily = await _forecast(hass, "daily")
    assert daily[-1]["uv_index"] is None


async def test_missing_daily(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """Without daily data, the daily forecast keeps BoM's seven days."""
    data = json.loads(fixture_bytes("open_meteo.json"))
    del data["daily"], data["daily_units"]
    aioclient_mock.get(OPEN_METEO_URL, text=json.dumps(data), headers=JSON)
    await setup_integration(hass, open_meteo_entry)
    assert open_meteo_entry.runtime_data.open_meteo.data.days == []
    assert len(await _forecast(hass, "daily")) == 7


async def test_updates_pushed_to_subscribers(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
) -> None:
    """New data from either source is sent to forecast subscribers."""
    await setup_integration(hass, open_meteo_entry)
    entity = hass.data["entity_components"][WEATHER_DOMAIN].get_entity(
        "weather.brisbane"
    )
    received: dict[str, list[Any]] = {"daily": [], "hourly": []}
    for forecast_type, updates in received.items():
        entity.async_subscribe_forecast(forecast_type, updates.append)

    runtime = open_meteo_entry.runtime_data
    await runtime.open_meteo.async_refresh()
    await hass.async_block_till_done()
    assert len(received["daily"]) == 1
    assert len(received["daily"][0]) == 15
    assert len(received["hourly"]) == 1

    # BoM's hourly forecast fails: subscribers switch to Open-Meteo's ...
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    await runtime.hourly.async_refresh()
    await hass.async_block_till_done()
    assert received["hourly"][-1][0]["datetime"].endswith("+10:00")
    assert len(received["hourly"]) == 2

    # ... and back to BoM's when it recovers.
    mock_client.get_hourly_forecast.side_effect = None
    await runtime.hourly.async_refresh()
    await hass.async_block_till_done()
    assert received["hourly"][-1][0]["datetime"].endswith("+00:00")
    assert len(received["hourly"]) == 3
    assert len(received["daily"]) == 1


async def test_stale_sources_refreshed_on_demand(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
    freezer: Any,
) -> None:
    """With polling disabled, old data expires and is refreshed when asked for."""
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    open_meteo_entry.add_to_hass(hass)
    hass.config_entries.async_update_entry(open_meteo_entry, pref_disable_polling=True)
    await setup_integration(hass, open_meteo_entry)
    assert open_meteo.call_count == 1
    assert len(await _forecast(hass, "hourly")) > 0

    # Hours later, nothing has polled. Asking for the hourly forecast refreshes
    # the stale sources instead of serving the old Open-Meteo data.
    freezer.tick(timedelta(hours=3))
    calls = mock_client.get_hourly_forecast.call_count
    hourly = await _forecast(hass, "hourly")
    assert mock_client.get_hourly_forecast.call_count > calls
    assert open_meteo.call_count == 2
    assert hourly

    # Stale Open-Meteo days are left out of the daily forecast and refreshed in
    # the background.
    freezer.tick(timedelta(hours=3))
    assert len(await _forecast(hass, "daily")) == 7
    # Let the debounced refresh request run.
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=11))
    await hass.async_block_till_done()
    assert open_meteo.call_count == 3
    assert len(await _forecast(hass, "daily")) == 15


async def test_cached_hourly_not_served_after_sources_fail(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """Once both sources have failed, the last hourly choice is not served."""
    aioclient_mock.get(
        OPEN_METEO_URL, text=fixture_bytes("open_meteo.json").decode(), headers=JSON
    )
    await setup_integration(hass, open_meteo_entry)
    assert await _forecast(hass, "hourly")

    runtime = open_meteo_entry.runtime_data
    entity = hass.data["entity_components"][WEATHER_DOMAIN].get_entity(
        "weather.brisbane"
    )
    received: list[Any] = []
    entity.async_subscribe_forecast("hourly", received.append)
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    aioclient_mock.clear_requests()
    aioclient_mock.get(OPEN_METEO_URL, status=500, headers=JSON, text="{}")
    await runtime.hourly.async_refresh()
    await runtime.open_meteo.async_refresh()
    await hass.async_block_till_done()
    # Subscribers learn there is no hourly forecast any more.
    assert not runtime.hourly_source.last_update_success
    assert received[-1] is None
    assert await _forecast(hass, "hourly") == []


async def test_due_source_refreshed_before_expiry(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
    freezer: Any,
) -> None:
    """A source an interval old is refreshed when the forecast is requested."""
    open_meteo_entry.add_to_hass(hass)
    hass.config_entries.async_update_entry(open_meteo_entry, pref_disable_polling=True)
    await setup_integration(hass, open_meteo_entry)
    await _forecast(hass, "hourly")
    calls = mock_client.get_hourly_forecast.call_count

    freezer.tick(timedelta(minutes=59))
    async_fire_time_changed(hass)
    await _forecast(hass, "hourly")
    assert mock_client.get_hourly_forecast.call_count == calls + 1
    # BoM is fresh again, so Open-Meteo is not asked.
    assert open_meteo.call_count == 1


async def test_failed_open_meteo_not_retried_by_subscribers(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """Daily forecast pushes do not retry a failing Open-Meteo early."""
    aioclient_mock.get(
        OPEN_METEO_URL,
        status=429,
        headers={**JSON, "Retry-After": "120"},
        text=json.dumps({"error": True, "reason": "slow down"}),
    )
    await setup_integration(hass, open_meteo_entry)
    entity = hass.data["entity_components"][WEATHER_DOMAIN].get_entity(
        "weather.brisbane"
    )
    received: list[Any] = []
    entity.async_subscribe_forecast("daily", received.append)
    calls = aioclient_mock.call_count
    # A new BoM daily forecast is pushed; the failing Open-Meteo is left alone.
    await open_meteo_entry.runtime_data.daily.async_refresh()
    await hass.async_block_till_done()
    assert len(received[-1]) == 7
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=11))
    await hass.async_block_till_done()
    assert aioclient_mock.call_count == calls


async def test_hourly_source_listens_only_while_subscribed(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
) -> None:
    """The hourly source only follows (and keeps polling) its sources while used."""
    await setup_integration(hass, open_meteo_entry)
    runtime = open_meteo_entry.runtime_data
    entity = hass.data["entity_components"][WEATHER_DOMAIN].get_entity(
        "weather.brisbane"
    )
    om_listeners = len(runtime.open_meteo._listeners)
    unsubscribe = entity.async_subscribe_forecast("hourly", lambda _: None)
    assert len(runtime.open_meteo._listeners) == om_listeners + 1
    # A second listener on the source does not follow the sources twice.
    remove_second = runtime.hourly_source.async_add_listener(lambda: None)
    assert len(runtime.open_meteo._listeners) == om_listeners + 1
    remove_second()
    assert len(runtime.open_meteo._listeners) == om_listeners + 1
    unsubscribe()
    assert len(runtime.open_meteo._listeners) == om_listeners
    assert runtime.hourly_source._unsub_sources == []


async def _polling_disabled(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    entry.add_to_hass(hass)
    hass.config_entries.async_update_entry(entry, pref_disable_polling=True)
    await setup_integration(hass, entry)


async def test_concurrent_requests_fetch_once(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
    freezer: Any,
) -> None:
    """Simultaneous requests refresh an expired source once, and both get it."""
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    await _polling_disabled(hass, open_meteo_entry)
    assert await _forecast(hass, "hourly")
    calls = mock_client.get_hourly_forecast.call_count

    # Both sources have expired: each request needs the refreshed data.
    freezer.tick(timedelta(hours=3))
    first, second = await asyncio.gather(
        _forecast(hass, "hourly"), _forecast(hass, "hourly")
    )
    assert mock_client.get_hourly_forecast.call_count == calls + 1
    assert open_meteo.call_count == 2
    assert first
    assert first == second


async def test_request_waits_for_running_poll(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    freezer: Any,
) -> None:
    """A request waits for a source's own poll that is already running."""
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    aioclient_mock.get(OPEN_METEO_URL, status=500, headers=JSON, text="{}")
    await setup_integration(hass, open_meteo_entry)
    runtime = open_meteo_entry.runtime_data
    recovered = mock_client.get_hourly_forecast.return_value
    freezer.tick(timedelta(hours=3))

    # BoM recovers, but slowly: its own poll is in flight when the forecast is
    # requested.
    release = asyncio.Event()

    async def slow_recovery(*_: Any) -> Any:
        await release.wait()
        return recovered

    mock_client.get_hourly_forecast.side_effect = slow_recovery
    poll = hass.async_create_task(runtime.hourly.async_refresh())
    await asyncio.sleep(0)
    calls = mock_client.get_hourly_forecast.call_count
    request = hass.async_create_task(_forecast(hass, "hourly"))
    await asyncio.sleep(0)
    release.set()
    await poll
    hourly = await request
    assert hourly
    assert hourly[0]["datetime"].endswith("+00:00")
    assert mock_client.get_hourly_forecast.call_count == calls


async def test_hourly_requests_honour_retry_after(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    freezer: Any,
) -> None:
    """Asking for the hourly forecast does not retry Open-Meteo before Retry-After."""
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    aioclient_mock.get(
        OPEN_METEO_URL,
        status=429,
        headers={**JSON, "Retry-After": "7200"},
        text=json.dumps({"error": True, "reason": "slow down"}),
    )
    await _polling_disabled(hass, open_meteo_entry)
    assert aioclient_mock.call_count == 1

    freezer.tick(timedelta(minutes=61))
    assert await _forecast(hass, "hourly") == []
    assert aioclient_mock.call_count == 1

    freezer.tick(timedelta(minutes=60))
    await _forecast(hass, "hourly")
    assert aioclient_mock.call_count == 2


async def test_daily_extension_recovers_without_polling(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    freezer: Any,
) -> None:
    """With polling disabled, a failed Open-Meteo is asked again once it is due."""
    aioclient_mock.get(OPEN_METEO_URL, status=500, headers=JSON, text="{}")
    await _polling_disabled(hass, open_meteo_entry)
    aioclient_mock.clear_requests()
    aioclient_mock.get(
        OPEN_METEO_URL, text=fixture_bytes("open_meteo.json").decode(), headers=JSON
    )

    # Not due yet: no request.
    assert len(await _forecast(hass, "daily")) == 7
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=11))
    await hass.async_block_till_done()
    assert aioclient_mock.call_count == 0

    freezer.tick(timedelta(minutes=61))
    assert len(await _forecast(hass, "daily")) == 7
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=11))
    await hass.async_block_till_done()
    assert aioclient_mock.call_count == 1
    assert len(await _forecast(hass, "daily")) == 15


async def test_no_source_fresh(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """The hourly source reports why there is no hourly forecast."""
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    aioclient_mock.get(OPEN_METEO_URL, status=500, headers=JSON, text="{}")
    await setup_integration(hass, open_meteo_entry)
    assert await _forecast(hass, "hourly") == []
    source = open_meteo_entry.runtime_data.hourly_source
    assert not source.last_update_success
    assert "Neither BoM nor Open-Meteo" in str(source.last_exception)


async def test_daylight_saving(
    hass: HomeAssistant,
    mock_client: MagicMock,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """Times keep their instants across a daylight saving change (Sydney)."""
    times = [f"2026-10-04T{hour:02}:00" for hour in range(5)]
    aioclient_mock.get(
        OPEN_METEO_URL,
        headers=JSON,
        text=json.dumps(
            {
                "latitude": -33.86,
                "longitude": 151.21,
                "generationtime_ms": 0.1,
                "utc_offset_seconds": 36000,
                "timezone": "Australia/Sydney",
                "timezone_abbreviation": "GMT+10",
                "elevation": 10.0,
                "hourly_units": {"time": "iso8601", "temperature_2m": "°C"},
                "hourly": {"time": times, "temperature_2m": [10.0] * 5},
            }
        ),
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Sydney",
        unique_id="NSW_PT131",
        data={**ENTRY_DATA, "timezone": "Australia/Sydney"},
        options={CONF_OPEN_METEO: True},
    )
    await setup_integration(hass, entry)
    coordinator = entry.runtime_data.open_meteo
    assert coordinator.last_update_success, repr(coordinator.last_exception.__cause__)
    hours = coordinator.data.hours
    instants = [hour.time.astimezone(UTC) for hour in hours]
    # One hour apart in real time, although clocks skip 02:00 to 03:00.
    assert [b - a for a, b in itertools.pairwise(instants)] == [timedelta(hours=1)] * 4
    assert [hour.time.isoformat() for hour in hours] == [
        "2026-10-04T00:00:00+10:00",
        "2026-10-04T01:00:00+10:00",
        "2026-10-04T03:00:00+11:00",
        "2026-10-04T04:00:00+11:00",
        "2026-10-04T05:00:00+11:00",
    ]


async def test_diagnostics_include_open_meteo(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
) -> None:
    """Diagnostics show the Open-Meteo coordinator and a sample of its data."""
    from custom_components.bom_australia.diagnostics import (
        async_get_config_entry_diagnostics,
    )

    await setup_integration(hass, open_meteo_entry)
    diagnostics = await async_get_config_entry_diagnostics(hass, open_meteo_entry)
    assert diagnostics["coordinators"]["open_meteo"]["last_update_success"]
    assert diagnostics["open_meteo"]["model"] == OPEN_METEO_MODEL
    assert len(diagnostics["open_meteo"]["days"]) == 3


@pytest.mark.parametrize(
    ("code", "is_night", "expected"),
    [
        (0, False, ATTR_CONDITION_SUNNY),
        (1, True, ATTR_CONDITION_CLEAR_NIGHT),
        (0, None, ATTR_CONDITION_SUNNY),
        (65, False, ATTR_CONDITION_POURING),
        (95, True, ATTR_CONDITION_LIGHTNING_RAINY),
        (42, False, None),
        (None, False, None),
    ],
)
def test_map_wmo_condition(
    code: int | None, is_night: bool | None, expected: str | None
) -> None:
    assert map_wmo_condition(code, is_night=is_night) == expected


async def test_wait_for_attempt_gives_up(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
) -> None:
    """Waiting for a fetch that never finishes stops after the timeout."""
    await setup_integration(hass, open_meteo_entry)
    coordinator = open_meteo_entry.runtime_data.open_meteo
    coordinator._attempt_done = asyncio.Event()
    with patch("custom_components.bom_australia.coordinator.ATTEMPT_WAIT", 0):
        await coordinator.async_wait_for_attempt()
    assert not coordinator._attempt_done.is_set()


async def test_cancelled_fetch_releases_waiters(
    hass: HomeAssistant,
    mock_client: MagicMock,
    open_meteo_entry: MockConfigEntry,
    open_meteo: AiohttpClientMocker,
) -> None:
    """A cancelled or superseded fetch never leaves a request waiting."""
    await setup_integration(hass, open_meteo_entry)
    coordinator = open_meteo_entry.runtime_data.hourly
    never = asyncio.Event()

    async def hang(*_: Any) -> Any:
        await never.wait()

    mock_client.get_hourly_forecast.side_effect = hang
    poll = hass.async_create_task(coordinator.async_refresh())
    await asyncio.sleep(0)
    waiter = hass.async_create_task(coordinator.async_wait_for_attempt())
    await asyncio.sleep(0)
    assert not waiter.done()
    poll.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await poll
    await asyncio.sleep(0)
    assert waiter.done()

    # Starting a new attempt releases anyone still waiting on an older one.
    stranded = asyncio.Event()
    coordinator._attempt_done = stranded
    coordinator._note_attempt()
    assert stranded.is_set()

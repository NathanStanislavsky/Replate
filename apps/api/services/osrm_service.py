"""
OSRM client (async, httpx).
Uses the Table API for many-to-one duration matrices and Route API as a single-pair fallback.

Env vars:
  OSRM_BASE_URL  – default: http://router.project-osrm.org
  OSRM_PROFILE   – default: driving
"""
import os
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

OSRM_BASE_URL = os.environ.get("OSRM_BASE_URL", "http://router.project-osrm.org").rstrip("/")
OSRM_PROFILE = os.environ.get("OSRM_PROFILE", "driving")

TIMEOUT = 5.0
RETRIES = 1


def _coord_str(lng: float, lat: float) -> str:
    return f"{lng},{lat}"


async def _get(url: str, params: dict) -> Optional[dict]:
    """GET with one retry on timeout/connection error."""
    for attempt in range(RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.get(url, params=params)
                r.raise_for_status()
                return r.json()
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            if attempt < RETRIES:
                logger.warning("OSRM request failed (attempt %d): %s — retrying", attempt + 1, e)
            else:
                logger.error("OSRM request failed after %d attempts: %s", RETRIES + 1, e)
        except httpx.HTTPStatusError as e:
            logger.error("OSRM HTTP error: %s", e)
            break
    return None


async def table_durations(
    origin: tuple[float, float],
    destinations: list[tuple[float, float]],
) -> list[Optional[float]]:
    """
    Get driving durations (seconds) from one origin to many destinations via OSRM Table API.

    Args:
        origin: (lng, lat)
        destinations: list of (lng, lat)

    Returns:
        List of durations in seconds, same order as destinations.
        None for unreachable destinations. Empty list on total failure.
    """
    if not destinations:
        return []

    coords = [_coord_str(*origin)] + [_coord_str(*d) for d in destinations]
    coord_str = ";".join(coords)
    url = f"{OSRM_BASE_URL}/table/v1/{OSRM_PROFILE}/{coord_str}"

    data = await _get(url, {"sources": "0", "annotations": "duration"})

    if data is None or data.get("code") != "Ok":
        logger.warning("OSRM table failed, returning None for all destinations")
        return [None] * len(destinations)

    # data["durations"][0] = row for the single source (index 0)
    # index 0 is origin itself (duration 0), indices 1..n are destinations
    row = data.get("durations", [[]])[0]
    return [row[i + 1] if i + 1 < len(row) else None for i in range(len(destinations))]


async def route_duration(
    origin: tuple[float, float],
    dest: tuple[float, float],
) -> Optional[float]:
    """
    Get driving duration (seconds) for a single origin → destination via OSRM Route API.
    Fallback for when Table API is unavailable or for one-off checks.

    Args:
        origin: (lng, lat)
        dest: (lng, lat)

    Returns:
        Duration in seconds, or None on failure.
    """
    coord_str = f"{_coord_str(*origin)};{_coord_str(*dest)}"
    url = f"{OSRM_BASE_URL}/route/v1/{OSRM_PROFILE}/{coord_str}"

    data = await _get(url, {"overview": "false"})

    if data is None or data.get("code") != "Ok":
        return None

    routes = data.get("routes", [])
    if not routes:
        return None
    return routes[0].get("duration")

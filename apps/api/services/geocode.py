"""
Geocode address once (on create/update). Nominatim or stub.
Returns (lng, lat) or None. Never call on map load.
"""
import os
import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


async def geocode_address(address: str) -> tuple[float, float] | None:
    if not address or not address.strip():
        return None
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                NOMINATIM_URL,
                params={"q": address, "format": "json", "limit": 1},
                headers={"User-Agent": "Replate/1.0"},
                timeout=5.0,
            )
            r.raise_for_status()
            data = r.json()
            if not data:
                return None
            lon = float(data[0]["lon"])
            lat = float(data[0]["lat"])
            return (lon, lat)
    except Exception:
        return None

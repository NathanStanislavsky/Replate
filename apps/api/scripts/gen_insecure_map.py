import os
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ----------------------------
# CONFIG
# ----------------------------

CENSUS_API_KEY = os.environ["CENSUS_KEY"]
YEAR = 2022  # most recent ACS 5-year available
DATASET = "acs/acs5"

# Suffolk County = Boston proper (MA FIPS: state=25, county=025)
COUNTIES = {
    "Suffolk": "025",
}

STATE_FIPS = "25"

# ACS Variables:
# B22003_001E = Total households
# B22003_002E = Households receiving SNAP
VARIABLES = [
    "B22003_001E",  # total households
    "B22003_002E"   # SNAP households
]

# Census TIGER GeoJSON for MA census tract boundaries (ACS 2022, 500k resolution)
TIGER_GEOJSON_URL = (
    "https://raw.githubusercontent.com/uscensusbureau/citysdk/"
    "master/v2/GeoJSON/500k/2022/25/tract.json"
)


# ----------------------------
# FETCH SNAP DATA
# ----------------------------

def fetch_county_tract_data(county_name, county_fips):
    url = f"https://api.census.gov/data/{YEAR}/{DATASET}"
    params = {
        "get": ",".join(["NAME"] + VARIABLES),
        "for": "tract:*",
        "in": f"state:{STATE_FIPS} county:{county_fips}",
        "key": CENSUS_API_KEY,
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    df = pd.DataFrame(data[1:], columns=data[0])
    df["county_name"] = county_name
    return df


# ----------------------------
# FETCH TRACT CENTROIDS
# ----------------------------

def fetch_tract_centroids(county_fips):
    """Download MA tract GeoJSON from Census TIGER and extract centroids for one county."""
    print("Fetching tract boundary centroids from TIGER...")
    r = requests.get(TIGER_GEOJSON_URL, timeout=60)
    r.raise_for_status()
    geojson = r.json()

    centroids = {}
    for feature in geojson["features"]:
        props = feature.get("properties", {})
        geoid = props.get("GEOID", "")
        # filter to the target county (state+county prefix)
        if not geoid.startswith(STATE_FIPS + county_fips):
            continue
        geom = feature.get("geometry")
        if not geom:
            continue
        if geom["type"] == "Polygon":
            rings = geom["coordinates"]
        elif geom["type"] == "MultiPolygon":
            rings = [ring for poly in geom["coordinates"] for ring in poly]
        else:
            continue
        # Simple centroid: average of all exterior ring vertices
        lngs, lats = [], []
        for ring in rings:
            for coord in ring[0] if isinstance(ring[0][0], list) else [ring[0]]:
                pass
        # Flatten all coordinates
        coords = []
        if geom["type"] == "Polygon":
            for ring in geom["coordinates"]:
                coords.extend(ring)
        else:
            for poly in geom["coordinates"]:
                for ring in poly:
                    coords.extend(ring)
        if coords:
            lngs = [c[0] for c in coords]
            lats = [c[1] for c in coords]
            centroids[geoid] = (sum(lats) / len(lats), sum(lngs) / len(lngs))

    print(f"  Found centroids for {len(centroids)} tracts in county {county_fips}.")
    return centroids


# ----------------------------
# MAIN
# ----------------------------

def main():
    all_data = []
    for county_name, county_fips in COUNTIES.items():
        print(f"Fetching SNAP data for {county_name}...")
        df = fetch_county_tract_data(county_name, county_fips)
        all_data.append(df)

    df = pd.concat(all_data, ignore_index=True)

    df["total_households"] = pd.to_numeric(df["B22003_001E"], errors="coerce")
    df["snap_households"] = pd.to_numeric(df["B22003_002E"], errors="coerce")
    df = df[df["total_households"] > 0]
    df["snap_rate"] = df["snap_households"] / df["total_households"]
    df["geoid"] = df["state"] + df["county"] + df["tract"]

    # Fetch centroids and merge
    county_fips = list(COUNTIES.values())[0]
    centroids = fetch_tract_centroids(county_fips)
    df["lat"] = df["geoid"].map(lambda g: centroids.get(g, (None, None))[0])
    df["lng"] = df["geoid"].map(lambda g: centroids.get(g, (None, None))[1])

    missing = df["lat"].isna().sum()
    if missing:
        print(f"  Warning: {missing} tracts had no centroid match.")

    final_df = df[[
        "geoid",
        "county_name",
        "tract",
        "lat",
        "lng",
        "snap_rate",
        "total_households",
        "snap_households",
    ]].rename(columns={"county_name": "county"})

    out_path = os.path.join(os.path.dirname(__file__), "..", "food_data", "greater_boston_snap_food_insecurity.csv")
    final_df.to_csv(out_path, index=False)
    print(f"Done. Saved to {os.path.normpath(out_path)}")


if __name__ == "__main__":
    main()

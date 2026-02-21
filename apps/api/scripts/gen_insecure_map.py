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


# ----------------------------
# FETCH FUNCTION
# ----------------------------

def fetch_county_tract_data(county_name, county_fips):
    url = f"https://api.census.gov/data/{YEAR}/{DATASET}"

    params = {
        "get": ",".join(["NAME"] + VARIABLES),
        "for": "tract:*",
        "in": f"state:{STATE_FIPS} county:{county_fips}",
        "key": CENSUS_API_KEY
    }

    response = requests.get(url, params=params)
    response.raise_for_status()

    data = response.json()
    df = pd.DataFrame(data[1:], columns=data[0])

    df["county_name"] = county_name
    return df


# ----------------------------
# MAIN
# ----------------------------

def main():
    all_data = []

    for county_name, county_fips in COUNTIES.items():
        print(f"Fetching {county_name}...")
        df = fetch_county_tract_data(county_name, county_fips)
        all_data.append(df)

    df = pd.concat(all_data, ignore_index=True)

    # Clean numeric fields
    df["total_households"] = pd.to_numeric(df["B22003_001E"], errors="coerce")
    df["snap_households"] = pd.to_numeric(df["B22003_002E"], errors="coerce")

    # Avoid division by zero
    df = df[df["total_households"] > 0]

    df["snap_rate"] = df["snap_households"] / df["total_households"]

    # Create full GEOID
    df["geoid"] = df["state"] + df["county"] + df["tract"]

    # Final clean dataframe
    final_df = df[[
        "geoid",
        "county_name",
        "tract",
        "snap_rate",
        "total_households",
        "snap_households"
    ]].rename(columns={
        "county_name": "county"
    })

    final_df.to_csv("greater_boston_snap_food_insecurity.csv", index=False)

    print("Done. File saved as greater_boston_snap_food_insecurity.csv")


if __name__ == "__main__":
    main()
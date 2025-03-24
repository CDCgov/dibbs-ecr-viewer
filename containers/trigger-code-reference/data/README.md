# Seeding the Terminology Exchange Service (TES) SQLite Database

Running the `seed_tes_data.py` script will create and populate the `tes.db` SQLite database with data. This database will then be queried to fetch condition and concept information used by the TCRS.

## Prerequisites

Before you can run the seed script, you'll need to acquire a TES API key. Make a TES account [here](https://tes.tools.aimsplatform.org/) and the `API-KEY` menu will be available to you once you log in.

## Running the script

1. Get set up to run the TCRS locally ([see here](../README.md#running-from-python-source-code))
2. Ensure dependencies have been installed (`pip install -r requirements.txt -r dev-requirements.txt`)
3. Update (or create) your `.env` file to include your TES API key. Ex: `TES_API_KEY=xxxx....`
4. If a `tes.db` file already exists in the `/data` directory, go ahead and delete it
5. Navigate into the `/data` directory (`cd /data`) and run the `seed_tes_data.py` script with `python seed_tes_data.py`. This will create the `tes.db` file and load it with data from the TES API
6. You should see the output from the script and a newly created `tes.db` database file in the `/data` directory

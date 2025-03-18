# Seeding the Terminology Exchange Service (TES) SQLite Database

Running the `tes_data.py` script will create and populate the `tes.db` SQLite database with data. This database will then be queried to fetch condition and concept information used by the TCRS.

## Prerequisites

Before you can run the seed script, you'll need to acquire a TES API key. Make a TES account [here](https://tes.tools.aimsplatform.org/) and the `API-KEY` menu will be available to you once you log in.

## Running the script

1. Install dependencies
2. Update (or create) your `.env` file to include your TES API key. Ex: `TES_API_KEY=xxxx....`
3. If a `tes.db` file already exists in the `/data` directory, go ahead and delete it
4. Run the `data/tes_data.py` script directly with `python data/tes_data.py`. This will create the `tes.db` file and load it with data from the TES API
5. You should see the output from the script and a newly created `tes.db` database file in the `/data` directory

# Manually Seeding the Terminology Exchange Service (TES) SQLite Database

**Important**: The process of seeding the TES DB has been automated, see the [update-trigger-code-reference-data.yaml](../../../.github/workflows/update-trigger-code-reference-data.yaml) workflow file which runs on a schedule or can be manually triggered.

Running the `seed_tes_data.py` script will create and populate the `tes.db` SQLite database with data. This database will then be queried to fetch condition and concept information used by the TCRS.

## TES version marker

The `tes-version.txt` file records the TES value set version used to generate the
committed `tes.db` file. The automation compares it with the latest TES version
to decide whether an update is needed.

An automated update pull request temporarily advances this marker before the
database is regenerated. That PR must not be merged until the workflow has
generated and validated a database containing the same version.

## GitHub Actions configuration

The repository must define a `TES_API_KEY` Actions secret. In **Settings →
Actions → General → Workflow permissions**, GitHub Actions must also be allowed
to create pull requests. The workflow grants write access only to the jobs that
create the update PR or commit its generated artifacts.

## Prerequisites

Before you can run the seed script, you'll need to acquire a TES API key. Make a TES account [here](https://tes.tools.aimsplatform.org/) and the `API-KEY` menu will be available to you once you log in.

## Update the RCKMS Condition Codes

When updating the TES database, ensure you also have the latest data on condition categories from the [RCKMS site](https://www.rckms.org/content-repository/).

## Running the script

1. Get set up to run the TCRS locally ([see here](../README.md#running-from-python-source-code))
2. Install the database-automation dependencies from the hashed lockfile:
   ```bash
   python -m pip install \
     --require-hashes \
     --only-binary :all: \
     --requirement automation-requirements.txt
   ```
3. Update (or create) your `.env` file to include your TES API key. Ex: `TES_API_KEY=xxxx....`
4. If a `tes.db` file already exists in the `/data` directory, go ahead and delete it
5. Navigate into the `/data` directory (`cd /data`) and run the `seed_tes_data.py` script with `python seed_tes_data.py <LATEST_TES_VERSION_DATE>`. This will create the `tes.db` file and load it with data from the TES API. The version string can be found on the TES web app by looking at the value set version used in any given condition group's value sets.
6. You should see the output from the script and a newly created `tes.db` database file in the `/data` directory

## Changing automation dependencies

`automation-requirements.in` lists the direct dependencies used to extract the
RCKMS worksheet and generate `tes.db`. After changing it, regenerate the
committed lockfile from the `trigger-code-reference` directory:

```bash
pip-compile \
  --generate-hashes \
  --output-file automation-requirements.txt \
  automation-requirements.in
```

The workflow installs only the resulting wheels and verifies their hashes.

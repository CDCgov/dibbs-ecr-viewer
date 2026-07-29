## Trigger code reference data update

TES published a new value set version:

- Current database version: `__CURRENT_VERSION__`
- Target TES version: `__LATEST_VERSION__`

The target version marker has already been updated on this PR branch. The database and generated CSV must be refreshed before this PR is merged. This PR remains a draft until the generated artifacts pass validation.

### Manual step: add the RCKMS workbook

1. Open the [RCKMS Content Repository](https://www.rckms.org/content-repository/).
2. Locate and download the RCKMS Condition Codes Excel workbook for the latest content release. It should be under "RCKMS Content Release XX" -> "RCKMS Conditions List and Condition Codes" -> "RCKMS Condition Codes_yyyymmdd.xlsx"
3. Do not open, resave, rename, or otherwise modify the downloaded workbook.
4. Check out the `__BRANCH_NAME__` branch locally.
5. Copy the downloaded file, with its original filename, into: `containers/trigger-code-reference/assets/`
6. Commit and push the workbook to this PR branch.

If GitHub displays an **Approve workflows to run** banner, a repository writer must approve it. GitHub requires this approval for pull-request events created or updated by the default Actions token.

The workflow will then:

1. Find the single `RCKMS Condition Codes*.xlsx` file added or updated by this PR.
2. Extract the worksheet named `RCKMS Condition Codes`.
3. Validate its nine expected columns and generate `RCKMS Condition Codes.csv`.
4. Rebuild `data/tes.db` using TES version `__LATEST_VERSION__`.
5. Validate the SQLite database and commit the generated CSV and database back to this PR.
6. Mark this PR ready for review.

The generated commit may cause one final approval-required workflow run. That run verifies that the committed database already matches the target version.

**Do not merge this PR until all checks pass.**

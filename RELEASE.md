# DIBBs Release Documentation

## Release Methodology: Semantic Versioning

DIBBs updates are released to the Github Container Registry (GCR) according to the guidelines set out in [Semantic Versioning 2.0.0](https://semver.org/) with each release's version following the pattern of MAJOR.MINOR.PATCH-rc[#]. Release candidate versions will be follwed by rc and a number. The following core tenets describe when each element of a release's version would be updated.

- **MAJOR** versions introduce breaking changes.

  A breaking change breaks backwards-compatibility with previous released versions. In other words, a breaking change is something that may cause a client's implementation to stop working when upgrading from a previous version. Common examples of breaking changes include:
  - Deleting an API endpoint
  - Deleting API parameters
  - Changing an API endpoint name
  - Changing the name of required parameters to an API endpoint
  - Adding new required parameters
  - Removing, restricting or changing functionality offered by an API endpoint
  - Updates to the database schema
  - Updates to the trigger code reference condition database

  Major version releases _may_ also include non-breaking enhancements and fixes.

  Major version releases will reset **MINOR** and **PATCH** versions to 0.

- **MINOR** versions introduce new, non-breaking functionality.

  Releases with enhancements that do not break backwards compatibility require a minor version update. Common examples of non-breaking changes include:
  - Adding a package, module, or method
  - Adding optional parameters

  Minor version releases _may_ also include fixes.

  Minor versions will reset **PATCH** version to 0.

- **PATCH** versions introduce non-breaking bug fixes.

  Releases that _only_ contain fixes are released as patches.

## eCR Viewer Release Process

Create a new release on [Github](https://github.com/CDCgov/dibbs-ecr-viewer/releases/new). Release candidate versions of deployment should ensure that `Set as a pre-release` is checked. The new release will trigger the [Create New Release action](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/.github/workflows/createNewRelease.yaml) which will run tests and image deployment.

1. **Start draft**: Navigate to the Releases page of the eCR Viewer GitHub repo. Click “Draft New Release”
2. **Release candidate tag & generate notes**: Create a new release candidate (rc) tag, using semantic versioning, e.g. “3.6.7-rc1” (no “v” in front). After selecting this, you’ll be able to confirm your previous tag and the “Generate release notes” button will become clickable. Click it!
   - Note: Update since 8.3.1: You must create a release candidate BEFORE creating a release with the final tag number. This is because once a tag has been created, the deployed images are immutable. Any further changes needed won’t get applied (as of 12/10/25, it’s a relatively new NIST-related setting).
3. **Edit release notes (async)**: The text box will populate with a list of merged commit names. Copy this list of commit names and edit it down, removing all entries unimportant to the end user, e.g., test updates, refactors, dependency bumps, chores, etc. This step can happen async while the other steps are being completed, but MUST BE COMPLETED BEFORE THE FINAL RELEASE IS CREATED AND PUBLISHED. Additional sections to add are listed below. Share the edited release notes with the PM and engineering team for review and approval. Once completed and approved, save the completed release notes. Don’t forget to confirm your release tag and previous tag if you closed your previous release page window.
   - _Release Summary_: A brief summary highlighting features or fixes most relevant to STLTs
   - _Infrastructure Changes_: This is extremely important and should contain all relevant information that end users might need to upgrade to the newest version. Ex: clearly listing new environment variables, why they are needed, and example values.
   - _Automated Database Migrations_: If the release contains a DB migration or an updated Trigger Code Reference TES DB, alert users in this section that they’ll need to migrate (See 3.4.0 for an example)
4. **Set as pre-release**: Before publishing, ensure that the “Set as a pre-release” checkbox is marked. The release should not be marked as the latest release until deployment and testing have been performed. Then Click “Publish Release”!
5. **Check images**: Clicking “Publish Release” will publish and initiate a GitHub action that creates and uploads new images to GHCR and attempt to deploy the images to our dev environments. Navigate to the [Actions](https://github.com/CDCgov/dibbs-ecr-viewer/actions) page for the repo and make sure the workflow runs properly and completes with all greens.
6. **Check packages**: Navigate to the [Packages](https://github.com/orgs/CDCgov/packages?repo_name=dibbs-ecr-viewer) page and click into a few of them. Ensure that the list of versions includes a new one with the proper tags (note: the latest tag should not be applied yet).
7. **Testing**: Test new features in the cloud and ensure they work for various configurations of the app. You will need to perform manual testing steps for all configurations. See Testing section below for testing configurations, manual testing checks, and common errors.
8. **Create latest release**: Once all tests have been performed and the app is confirmed to be functioning as expected, return to the Releases page and _create a new release with the final tag number_ (excluding the release candidate version, i.e. `3.6.7`).
   - Edit your release with the final updated release notes from Step 3.
   - Set as pre-release to ensure all checks pass (again).
   - Once all checks pass & the final release notes have been included:
   - Edit release → “Set as the latest release” → Save changes.
   - This will trigger another GitHub action job that will update the ghcr images to have the `latest` tag and will deploy the docs
9. **Check docs**: Check that the docs are deployed as expected and the packages have the correct image tagged `latest`.

You have just released the newest version of the DIBBs eCR Viewer!

### Testing

For each of the test environments, perform manual checks, including (but not limited to):

- Any new features/fixes added in this release
- Running database migrations, & setting up an init admin user
- Running an eCR through the pipeline
- Ensuring the eCR appears in the Library (non-integrated/dual) / Viewer as expected
- Ensuring admin/program admin functionality (creating/editing/deleting program areas and users) works as expected
- Ensuring standard user functionality (users assigned to specific programs can only see eCRs with those assigned reportable conditions)
- Logging in/out of the application with different user types and permissions

Please refer to the [API Reference Documentation](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/API%20Reference%20Documentation.md) for instructions on migrating the database and processing eCRs through the API.

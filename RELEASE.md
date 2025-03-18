# DIBBs Release Documentation

## Release Methodology: Semantic Versioning

API documentation is published automatically with Sphinx and hosted via GitHub pages. DIBBs updates are released to the Github Container Registry (GCR) according to the guidelines set out in [Semantic Versioning 2.0.0](https://semver.org/) with each release's version following the pattern of MAJOR.MINOR.PATCH-BETA[#]. Beta versions will be follwed by BETA and a number. The following core tenets describe when each element of a release's version would be updated.

- **MAJOR** versions introduce breaking changes.

  A breaking change breaks backwards-compatibility with previous released versions. In other words, a breaking change is something that may cause a client's implementation to stop working when upgrading from a previous version. Common examples of breaking changes include:

  - Deleting a package or public functions/methods
  - Deleting public function parameters
  - Changing a function name
  - Changing the name or order of required parameters
  - Adding new required parameters
  - Removing, restricting or changing functionality offered by a public function

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

## DIBBs Release Process

Create a new release on [Github](https://github.com/CDCgov/dibbs-ecr-viewer/releases/new). Beta versions of deployment should ensure that `Set as a pre-release` is checked. The new release will trigger the [createNewRelease action](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/.github/workflows/createNewRelease.yaml) which will run tests and image deployment.

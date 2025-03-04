---
name: Streamline Release Template 🚀
about: The process for the team to go through creation of a new release
title: ""
labels: Streamline eCR
assignees: ""
---

# Release Request

_Any details about who this release is for, or when it needs to be completed._

# Release Checklist

- [ ] Beta image published with release notes
- [ ] Deployment options updated
  - [ ] AWS Terraform updated
  - [ ] Azure Terraform updated
  - [ ] VM updated
- [ ] Test environments available
- [ ] Testing conducted for:
  - [ ] AWS integrated
  - [ ] Azure integrated
  - [ ] AWS non-integrated, extended, SQLServer
  - [ ] Azure non-integrated, extended, SQLServer
  - [ ] GCP non-integrated, core, SQLServer (VM)
- [ ] Final release published
- [ ] Customers notified

# Release Process

_Details about each of the release process steps_

## Draft Images Created

Draft images need to be published to GHCR, taking the form of `release-name-beta`. Any environment variable or configuration updates should be clearly communicated to the DevOps team and end users via release notes of this beta release.

## Deployment Options Updated

If there are environment variable or config changes required, the DevOps team will need to make changes to the deployment options for eCR Viewer. Today, these include:

- AWS Terraform module
- Azure Terraform release
- Virtual Machine workflow

## Deploy New Versions

Once the Terraform changes have been made, the DevOps team will kick off a new deployment with the updated code.

## Test Deployments

Once the new deployments are available in development environments, the dev team needs to test all release configurations that are in use by STLT customers (these can be found in Notion). In particular, we'll need to regression test:

- Integrated and non-integrated Viewer
- Core and extended schema
- Azure and AWS releases
- Blob storage functionality across cloud providers
- Postgres and SQL Server

If any changes are required, iteration will happen in this stage.

## Publish Release

Once the release has been fully vetted and approved, publish the release by removing the `beta` tag from the release candidate. Then, notify STLT partners as appropriate that a new release is available.

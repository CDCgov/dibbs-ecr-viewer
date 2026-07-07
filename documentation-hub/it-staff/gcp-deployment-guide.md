---
title: GCP Deployment Guide
group: Deployment
category: Guides
---

# eCR Viewer Cloud Deployment Guide - GCP

This guide explains how to deploy eCR Viewer on GCP using:

- Linux Scripts: Ubuntu compatible scripts that configure a virtual machine to run the eCR Viewer containers

For details on environment variables and configuration options, refer to the [eCR Viewer Setup Guide](https://cdcgov.github.io/dibbs-ecr-viewer/documents/Setup_Guide.html#general-background) and [environment variable reference](https://cdcgov.github.io/dibbs-ecr-viewer/modules/environment.EnvironmentVariables.html).

## Linux Scripts

This option offers the following:

- A deployment that doesn’t require managing custom-built VM images
- A cloud-agnostic or on-prem deployment
- A straightforward operational model (one Linux VM running Docker containers)
- A traditional “server-based” approach

Primary repo: [dibbs-ecr-viewer](https://github.com/CDCgov/dibbs-ecr-viewer/tree/main) <br>
README: https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/deployment/vm/README.md <br>

### Skill requirements

Doing this work will require staff who can:

- Run scripts on a GCP VM.
- Install and operate Docker + Docker Compose
- Manage Virtual Private Cloud (VPC) networking/Firewall rules and access to supporting services (storage, database, identity)

## VM deployment on GCP

### Prerequisites

#### Application prerequisites

Be­fore you get start­ed, please make sure you have determined the eCR Viewer configuration your organization plans to use.

View the [Setup Guide](https://cdcgov.github.io/dibbs-ecr-viewer/documents/Setup_Guide.html#general-background) and [Environment variable reference](https://cdcgov.github.io/dibbs-ecr-viewer/modules/environment.EnvironmentVariables.html) for information about the available configurations.

#### Infrastructure prerequisites

- Ability to create an GCS bucket to store eCR data
- Ability to create an GCE VM instance
- Ability to create IAM Service Accounts and Roles to allow resource access
- A database accessible over the GCP network if you are using `NON_INTEGRATED` or `DUAL` configurations
- An Entra or Keycloak client registration or NBS authentication, depending on your configuration

#### GCP account prerequisites

Before you deploy, you should have:

- A GCP Project with the permissions and functionality required to deploy and operate an GCE VM instance
- Access to an Ubuntu image on the GCP marketplace or standard image library

### Deployment workflow

Use the [dibbs-ecr-viewer](https://github.com/CDCgov/dibbs-ecr-viewer/tree/main) repository as the source of truth.

The high-level workflow below is provided as a guide to help you understand the overall deployment sequence:

1. Decide your eCR Viewer configuration
2. Configure your GCP Project to support the eCR Viewer (e.g., GCS bucket, Cloud SQL)
3. Launch an Ubuntu-based GCE instance
4. Secure the VM using VPC Firewall Rules according to your policy rules
5. Configure the eCR Viewer environment variables using the ecrv-update script
6. Run Technical Acceptance Testing

# Data Ingestion Building Blocks (DIBBs) eCR Viewer README

# Table of Contents

* Overview  
* Problem Scope  
* Product Vision  
* Deployment Instructions  
* Documentation   
* Getting in Touch  
* Standard Notices


  

**General disclaimer:** This repository was created for use by CDC programs to collaborate on public health related projects in support of the [CDC mission](https://www.cdc.gov/about/cdc/index.html). GitHub is not hosted by the CDC, but is a third party website used by CDC and its partners to share information and collaborate on software. CDC use of GitHub does not imply an endorsement of any one particular service, product, or enterprise

# Overview

This repository is a part of the CDC DIBBs project and contains the core software for the DIBBs eCR Viewer.

The eCR Viewer is a tool that provides a human-readable view of eCRs, making it easier for public health staff to find relevant information in eCR documents. It combines both the electronic initial case report (eICR) and Reportability Response (RR) into a single view and highlights relevant lab or clinical information for conditions present in the eCR. It is designed for case investigators, eCR coordinators, and others who review eCRs. 

There are three eCR Viewer options:

1. Integrated eCR Viewer  \- The eCR Viewer built directly into NBS (National Electronic Disease Surveillance System Base System) or EpiTrax, providing a standardized way to view an individual eCR within those systems   
2. Standalone eCR Library \- A separate tool public health agencies (PHAs) can use to manage and view eCR documents outside their surveillance system; it uses the same eCR Viewer as the integrated version for individual views of an eCR   
3. Dual-boot mode \- Allows PHAs to access the eCR Viewer from two different entry points: either through NBS/EpiTrax (integrated) or through the eCR Library 

*Figure 1: Accessing integrated eCR Viewer from EpiTrax*

![Screenshot of Epitrax application with "View eCR Document" button highlighted](assets/images/epitrax.png)

*Figure 2\. View of the eCR Library*

![Screenshot of eCR Viewer eCR Library](assets/images/ecr-library.png)

*Figure 3\. View of an eCR in the eCR Viewer through integrated, library, or dual-boot option.*

![Screenshot of an eCR Summary in the eCR Viewer](assets/images/ecr-summary.png)

# Problem Scope

Electronic Case Reporting (eCR) provides a valuable way to share data between electronic health records and PHAs. However, because these files contain a large volume of information and the formatting often varies, it can take extra time and effort for epidemiologists and case investigators to locate the specific clinical and lab details needed for their work.

The eCR Viewer simplifies the process of reviewing eCRs for public health staff. It solves the problem of navigating scattered and dense data through a single, intuitive web interface that highlights and organizes relevant information in eCR documents.

Our overall objective is to help the CDC best support PHAs in moving towards a modern public health data infrastructure. See our [public demo website](https://dibbs.tools/) for more details.

# Product Vision

The eCR Viewer is a public health surveillance tool (i.e., not a clinical tool, a billing tool, an insurance tool, a patient portal, etc.). 

To maintain the stability, reliability, and core functionality of the eCR Viewer, the following boundaries define acceptable changes, updates, and customizations for future maintainers and contributors. These boundaries ensure that we do not compromise the core architecture or negatively impact other users of the eCR Viewer. We encourage you to fork this repository if you would like to build a custom implementation that falls outside the boundaries established here.

## Database & Schema Management

For the database required by the eCR Library, the boundaries are defined as follows:

* **Core and Extended Schemas:** These schemas hold the essential architecture required for the eCR Library to function and provide a comprehensive view of eCR data. No modifications are permitted to either schema to ensure stability.   
* **Customized Schemas:** Contributors can fork or configure their own customized schemas for the eCR Viewer. To use a customized schema, implementing teams are entirely responsible for writing the supporting code, changing the necessary environmental variables, and maintaining that custom codebase.  
* **Database Compatibility:** The eCR Viewer architecture currently supports SQL Server and PostgreSQL for storing metadata.  
  * Future updates or contributions may introduce compatibility for other relational database types that are supported by [Kysely](https://kysely.dev/docs/dialects).

## eCR Data Mutability and Presentation

The core purpose of the eCR Viewer is presentation, not data entry or modification. To uphold this boundary, contributors must not introduce or accept architectural changes that allow users to edit or modify eCR data. 

Based on organizational priorities, there is scope for expanding eCR Viewer capacity to visualize the data in ways that improve case investigation.

## Identity Providers 

The eCR Viewer architecture is designed to be flexible regarding authentication and permits the integration of additional Identity Providers to accommodate organizational needs.

## Healthcare Data Specifications 

The eCR Viewer supports the following healthcare data specifications:

* **FHIR Support:** The eCR Viewer exclusively supports FHIR R4. (For more details on our FHIR implementation, please refer to the [Relevant HL7 Implementation Guides & Specifications wiki](https://github.com/CDCgov/dibbs-FHIR-Converter/wiki/Relevant-HL7-Implementation-Guides-&-Specifications)).  
* **eCR Support:** The eCR Viewer supports eCR version 3.1.1 and earlier.  
* **Version Floor:** While we are backwards compatible for eCR version, any earlier versions of FHIR will not be supported or rendered by the Viewer.

# Deployment Instructions

The eCR Viewer ecosystem relies on modular building blocks and infrastructure repositories and runs as a set of containers connected on a shared network. While each container is an independent service, they work together in a coordinated pipeline. 

The services that make up the stack are:

* **eCR-viewer:** The portal to view eCRs. Requires environment variables for storage, authentication, and connecting to the orchestration service.  
* **Ingestion:** Standardizes data fields from FHIR bundles. No environment variables required.  
* **fhir-converter:** Converts eCRs to FHIR format. No environment variables required.  
* **fhir-converter-proxy (optional):** An HAProxy load balancer that distributes workloads by routing incoming eCR payloads across multiple FHIR Converter instances. Requires environment variables for configuration.   
* **message-parser:** Extracts fields from FHIR bundles for database storage. No environment variables required.  
* **trigger-code-reference:** “Stamps” FHIR bundles with SNOMED condition codes. No environment variables required.  
* **Orchestration:**  Configuration-driven engine that chains the backend services together. Requires environment variables pointing to each service URL.

## Deployment Scripts

Below are the resources needed to deploy the application

* [dibbs-ecr-viewer/deployment](https://github.com/CDCgov/dibbs-ecr-viewer/tree/main/deployment/README.md) \- Instructions intended build a lower level understanding of how the system fits together. \`docker run\` commands, including minimum required environment variables and service start order.   
* [dibbs-ecr-viewer/deployment/vm](https://github.com/CDCgov/dibbs-ecr-viewer/tree/main/deployment/vm) – For provisioning and managing an eCR Viewer deployment on an Ubuntu VM. Uses bash scripts and Docker Compose to start the containers. Includes a bash script to assist in environment variable setup.

## Archived Example Repositories

* [dibbs-aws](https://github.com/CDCgov/dibbs-aws) – Infrastructure-as-code to run the eCR Viewer in an AWS environment. Defines ECS task definitions, networking, roles, and helper scripts.  
* [dibbs-azure](https://www.google.com/search?q=https://github.com/CDCgov/dibbs-azure) – Infrastructure-ascode to run the eCR Viewer in an Azure environment. Defines Azure Container Instances, and networking.

## Related Repositories

In addition to our deployment infrastructure, the following related utilities support the eCR Viewer:

* [FHIR Converter](https://github.com/CDCgov/dibbs-FHIR-Converter) – A fork of the [Microsoft FHIR Converter](https://github.com/microsoft/FHIR-Converter), which significantly expands the coverage for eCR C-CDA conversion to FHIR.  
* [eICR-anonymization](https://github.com/CDCgov/eicr-anonymization) – A utility that anonymizes eCR/RR files for use in testing.  
* [dibbs-star-wars-ecr-data](https://github.com/CDCgov/dibbs-star-wars-ecr-data) – A utility that generates synthetic eCR files with configurable contents for testing purposes.

# Documentation 

Please find the following guides, technical specifications, and training materials for the eCR Viewer, organized by relevant users:

For public health case investigators  
*(Resources for end users, epidemiologists, and eCR coordinators who use the tool in their daily workflows)*

* [One-Pager](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/end-users/One%20Pager%20-%20eCR%20Viewer.pdf)  
* [Overview Deck](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/end-users/Overview%20Deck.pdf)  
* [Frequently Asked Questions](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/end-users/Frequently%20Asked%20Questions%20Guide.pdf)   
* [User Acceptance Testing Guide \- eCR Coordinator](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/end-users/User%20Acceptance%20Testing%20Guide%20-%20eCR%20Coordinator.pdf)  
* [User Acceptance Testing Guide \- End users](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/end-users/User%20Acceptance%20Testing%20Guide%20-%20End%20Users.pdf)  
* [User Acceptance Testing Checklist \- End users](https://github.com/CDCgov/dibbs-ecr-viewer/raw/refs/heads/main/documentation-hub/end-users/User%20Acceptance%20Testing%20Checklist%20-%20End%20Users.xlsx)   
* [User Guide](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/end-users/User%20Guide.pdf)

For public health IT staff  
*(Resources for informatics teams, system administrators, IT operations, and developers responsible for implementation, deployment, and ongoing support)*

* [Implementation Checklist](https://github.com/CDCgov/dibbs-ecr-viewer/raw/refs/heads/main/documentation-hub/it-staff/Implementation%20Checklist.xlsx)  
* [Setup Guide](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/Setup%20Guide.md)  
* Cloud Deployment Guides ([AWS](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/AWS%20Deployment%20Guide.md), [Azure](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/Azure%20Deployment%20Guide.md), [GCP](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/GCP%20Deployment%20Guide.md))  
* [NBS Integration Guide](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/NBS%20Integration%20Guide.pdf)  
* [Technical Acceptance Testing](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/Technical%20Acceptance%20Testing.md)  
* [User Acceptance Testing Checklist \- Informatics](https://github.com/CDCgov/dibbs-ecr-viewer/raw/refs/heads/main/documentation-hub/it-staff/User%20Acceptance%20Testing%20Checklist%20-%20Informatics.xlsx)  
* Maintenance Guide  
* [Audit Logging](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/Audit%20Logging.md)  
* [API Reference Documentation](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/API%20Reference%20Documentation.md)  
* [Database Documentation](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/Database%20Documentation.md)  
* [Environment Variables](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/documentation-hub/it-staff/Environment%20Variables.md)

# Getting in Touch

If you're interested in adopting the eCR Viewer or want to learn more about our work, please reach out to [dibbs@cdc.gov](mailto:dibbs@cdc.gov).

# Standard Notices

## Public Domain Standard Notice

This repository constitutes a work of the United States Government and is not subject to domestic copyright protection under 17 USC § 105\. This repository is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/). All contributions to this repository will be released under the CC0 dedication. By submitting a pull request you are agreeing to comply with this waiver of copyright interest.

## License Standard Notice

This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/). All contributions to this project will be released under the CC0 dedication. By submitting a pull request or issue, you are agreeing to comply with this waiver of copyright interest and acknowledge that you have no expectation of payment, unless pursuant to an existing contract or agreement.

## Privacy Standard Notice

This repository contains only non-sensitive, publicly available data and information. All material and community participation is covered by the [Disclaimer](https://github.com/CDCgov/template/blob/master/DISCLAIMER.md) and [Code of Conduct](https://github.com/CDCgov/template/blob/master/code-of-conduct.md). For more information about CDC's privacy policy, please visit [http://www.cdc.gov/other/privacy.html](https://www.cdc.gov/other/privacy.html).

## Contributing Standard Notice

Anyone is encouraged to contribute to the repository by [forking](https://help.github.com/articles/fork-a-repo) and submitting a pull request. (If you are new to GitHub, you might start with a [basic tutorial](https://help.github.com/articles/set-up-git).) By contributing to this project, you grant a world-wide, royalty-free, perpetual, irrevocable, non-exclusive, transferable license to all users under the terms of the [Apache Software License v2](http://www.apache.org/licenses/LICENSE-2.0.html) or later.

All comments, messages, pull requests, and other submissions received through CDC including this GitHub page may be subject to applicable federal law, including but not limited to the Federal Records Act, and may be archived. Learn more at [http://www.cdc.gov/other/privacy.html](http://www.cdc.gov/other/privacy.html).

See [CONTRIBUTING.md](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/docs/CONTRIBUTING.md) for more information.

## Records Management Standard Notice

This repository is not a source of government records, but is a copy to increase collaboration and collaborative potential. All government records will be published through the [CDC website](http://www.cdc.gov/).

## Related Documents

* [Open Practices](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/docs/open_practices.md)  
* [Rules of Behavior](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/docs/rules_of_behavior.md)  
* [Disclaimer](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/docs/DISCLAIMER.md)  
* [Contribution Notice](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/docs/CONTRIBUTING.md)  
* [Code of Conduct](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/docs/code-of-conduct.md)

## Additional Standard Notices

Please refer to [CDC's Template Repository](https://github.com/CDCgov/template) for more information about [contributing to this repository](https://github.com/CDCgov/template/blob/master/CONTRIBUTING.md), [public domain notices and disclaimers](https://github.com/CDCgov/template/blob/master/DISCLAIMER.md), and [code of conduct](https://github.com/CDCgov/template/blob/master/code-of-conduct.md).  

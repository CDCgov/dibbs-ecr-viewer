---
title: Database Documentation
group: Documents
category: Guides
---

# Database Documentation

This document provides an overview of the database schema used by the DIBBS eCR Viewer, including both the core and extended schemas, and information about supported database types.

## Supported Database Types

The DIBBS eCR Viewer supports the following relational database types for storing metadata:

- **SQL Server**
- **PostgreSQL**

## Core Schema

The core schema contains essential data related to eCRs and their associated conditions and rule summaries. This schema is fundamental to the operation of the eCR Viewer.

### `ecr_data` Table

This table stores the primary eCR data.

| Column Name            | Data Type      | Nullability | Default Value     | Description                                  |
| :--------------------- | :------------- | :---------- | :---------------- | :------------------------------------------- |
| `eicr_id`              | `varchar(200)` | NOT NULL    |                   | Primary key, unique identifier for the eICR  |
| `set_id`               | `varchar(255)` | NULL        |                   | Identifier for a set of related eICRs        |
| `eicr_version_number`  | `varchar(50)`  | NULL        |                   | Version number of the eICR                   |
| `fhir_reference_link`  | `varchar(255)` | NULL        |                   | Reference link to the FHIR resource          |
| `last_name`            | `varchar(255)` | NOT NULL    |                   | Patient's last name                          |
| `first_name`           | `varchar(255)` | NOT NULL    |                   | Patient's first name                         |
| `birth_date`           | `date`         | NOT NULL    |                   | Patient's birth date                         |
| `encounter_start_date` | `datetime`     | NULL        |                   | Start date and time of the patient encounter |
| `date_created`         | `datetime`     | NOT NULL    | Current timestamp | Date and time when the record was created    |

### `ecr_rr_conditions` Table

This table stores conditions associated with eCRs.

| Column Name | Data Type      | Nullability | Default Value | Description                                             |
| :---------- | :------------- | :---------- | :------------ | :------------------------------------------------------ |
| `uuid`      | `varchar(200)` | NOT NULL    |               | Primary key, unique identifier for the condition record |
| `eicr_id`   | `varchar(255)` | NOT NULL    |               | Foreign key, references `ecr_data.eicr_id`              |
| `condition` | `varchar(max)` | NULL        |               | Description of the condition                            |

### `ecr_rr_rule_summaries` Table

This table stores rule summaries related to eCR conditions.

| Column Name            | Data Type      | Nullability | Default Value | Description                                                |
| :--------------------- | :------------- | :---------- | :------------ | :--------------------------------------------------------- |
| `uuid`                 | `varchar(200)` | NOT NULL    |               | Primary key, unique identifier for the rule summary record |
| `ecr_rr_conditions_id` | `varchar(200)` | NOT NULL    |               | Foreign key, references `ecr_rr_conditions.uuid`           |
| `rule_summary`         | `varchar(max)` | NULL        |               | Summary of the rule applied                                |

## Extended Schema

The extended schema builds upon the core schema by adding additional demographic, clinical, and administrative data points to the `ecr_data` table, and introduces new tables for laboratory results and patient addresses. This schema provides a more comprehensive view of the eCR data.

### Alterations to `ecr_data` Table

The following columns are added to the `ecr_data` table in the extended schema:

| Column Name                | Data Type      | Nullability | Default Value | Description                                                                              |
| :------------------------- | :------------- | :---------- | :------------ | :--------------------------------------------------------------------------------------- |
| `gender`                   | `varchar(100)` | NULL        |               | Patient's gender                                                                         |
| `birth_sex`                | `varchar(255)` | NULL        |               | Patient's birth sex                                                                      |
| `race`                     | `varchar(255)` | NULL        |               | Patient's race                                                                           |
| `ethnicity`                | `varchar(255)` | NULL        |               | Patient's ethnicity                                                                      |
| `latitude`                 | `numeric`      | NULL        |               | Latitude of patient's location                                                           |
| `longitude`                | `numeric`      | NULL        |               | Longitude of patient's location                                                          |
| `homelessness_status`      | `varchar(255)` | NULL        |               | Patient's homelessness status                                                            |
| `disabilities`             | `varchar(255)` | NULL        |               | Patient's disabilities                                                                   |
| `tribal_affiliation`       | `varchar(255)` | NULL        |               | Patient's tribal affiliation                                                             |
| `tribal_enrollment_status` | `varchar(255)` | NULL        |               | Patient's tribal enrollment status                                                       |
| `current_job_title`        | `varchar(255)` | NULL        |               | Patient's current job title                                                              |
| `current_job_industry`     | `varchar(255)` | NULL        |               | Patient's current job industry                                                           |
| `usual_occupation`         | `varchar(255)` | NULL        |               | Patient's usual occupation                                                               |
| `usual_industry`           | `varchar(255)` | NULL        |               | Patient's usual industry                                                                 |
| `preferred_language`       | `varchar(255)` | NULL        |               | Patient's preferred language                                                             |
| `pregnancy_status`         | `varchar(255)` | NULL        |               | Patient's pregnancy status                                                               |
| `rr_id`                    | `varchar(255)` | NULL        |               | Response Report ID                                                                       |
| `processing_status`        | `varchar(255)` | NULL        |               | Processing status of the eCR                                                             |
| `authoring_date`           | `datetime`     | NULL        |               | Date of authoring                                                                        |
| `authoring_provider`       | `varchar(255)` | NULL        |               | Authoring provider                                                                       |
| `provider_id`              | `varchar(255)` | NULL        |               | Provider ID                                                                              |
| `facility_id`              | `varchar(255)` | NULL        |               | Facility ID                                                                              |
| `facility_name`            | `varchar(255)` | NULL        |               | Facility name                                                                            |
| `encounter_type`           | `varchar(255)` | NULL        |               | Type of encounter                                                                        |
| `encounter_end_date`       | `datetime`     | NULL        |               | End date and time of the patient encounter                                               |
| `reason_for_visit`         | `varchar(max)` | NULL        |               | Reason for visit (Multiple values are concatenated into a single comma-separated string) |
| `active_problems`          | `varchar(max)` | NULL        |               | Active problems (Multiple values are concatenated into a single comma-separated string)  |

### `ecr_labs` Table

This table stores laboratory results associated with eCRs. Note that the primary key for this table is a compound primary key consisting of `uuid` and `eicr_id`.

| Column Name                              | Data Type      | Nullability | Default Value | Description                                                                                   |
| :--------------------------------------- | :------------- | :---------- | :------------ | :-------------------------------------------------------------------------------------------- |
| `uuid`                                   | `varchar(200)` | NOT NULL    |               | Part of the composite primary key [uuid, eicr_id], unique identifier for the lab record       |
| `eicr_id`                                | `varchar(200)` | NOT NULL    |               | Part of the composite primary key [uuid, eicr_id], Foreign key, references `ecr_data.eicr_id` |
| `test_type`                              | `varchar(255)` | NULL        |               | Type of test performed                                                                        |
| `test_type_code`                         | `varchar(255)` | NULL        |               | Code for the test type                                                                        |
| `test_type_system`                       | `varchar(255)` | NULL        |               | Coding system for the test type                                                               |
| `test_result_qualitative`                | `varchar(255)` | NULL        |               | Qualitative test result                                                                       |
| `test_result_quantitative`               | `numeric`      | NULL        |               | Quantitative test result                                                                      |
| `test_result_units`                      | `varchar(50)`  | NULL        |               | Units for the quantitative test result                                                        |
| `test_result_code`                       | `varchar(255)` | NULL        |               | Code for the test result                                                                      |
| `test_result_code_display`               | `varchar(255)` | NULL        |               | Display name for the test result code                                                         |
| `test_result_code_system`                | `varchar(255)` | NULL        |               | Coding system for the test result code                                                        |
| `test_result_interpretation`             | `varchar(255)` | NULL        |               | Interpretation of the test result                                                             |
| `test_result_interpretation_code`        | `varchar(255)` | NULL        |               | Code for the test result interpretation                                                       |
| `test_result_interpretation_system`      | `varchar(255)` | NULL        |               | Coding system for the test result interpretation                                              |
| `test_result_reference_range_low_value`  | `numeric`      | NULL        |               | Lower bound of the reference range                                                            |
| `test_result_reference_range_low_units`  | `varchar(50)`  | NULL        |               | Units for the lower bound of the reference range                                              |
| `test_result_reference_range_high_value` | `numeric`      | NULL        |               | Upper bound of the reference range                                                            |
| `test_result_reference_range_high_units` | `varchar(50)`  | NULL        |               | Units for the upper bound of the reference range                                              |
| `specimen_type`                          | `varchar(255)` | NULL        |               | Type of specimen                                                                              |
| `specimen_collection_date`               | `date`         | NULL        |               | Date of specimen collection                                                                   |
| `performing_lab`                         | `varchar(255)` | NULL        |               | Performing laboratory                                                                         |

### `patient_address` Table

This table stores patient address information. Note that the primary key for this table is a compound primary key consisting of `uuid` and `eicr_id`.

| Column Name    | Data Type      | Nullability | Default Value | Description                                                                                   |
| :------------- | :------------- | :---------- | :------------ | :-------------------------------------------------------------------------------------------- |
| `uuid`         | `varchar(200)` | NOT NULL    |               | Part of the composite primary key [uuid, eicr_id], unique identifier for the address record   |
| `use`          | `varchar(50)`  | NULL        |               | Purpose of the address (e.g., "home", "work")                                                 |
| `type`         | `varchar(50)`  | NULL        |               | Type of address (e.g., "physical", "postal")                                                  |
| `text`         | `varchar(255)` | NULL        |               | Full text representation of the address                                                       |
| `line`         | `varchar(255)` | NULL        |               | Street address line                                                                           |
| `city`         | `varchar(100)` | NULL        |               | City                                                                                          |
| `district`     | `varchar(100)` | NULL        |               | District                                                                                      |
| `state`        | `varchar(100)` | NULL        |               | State                                                                                         |
| `postal_code`  | `varchar(20)`  | NULL        |               | Postal code                                                                                   |
| `country`      | `varchar(100)` | NULL        |               | Country                                                                                       |
| `period_start` | `datetime`     | NULL        |               | Start date of the address's validity period                                                   |
| `period_end`   | `datetime`     | NULL        |               | End date of the address's validity period                                                     |
| `eicr_id`      | `varchar(200)` | NOT NULL    |               | Part of the composite primary key [uuid, eicr_id], Foreign key, references `ecr_data.eicr_id` |

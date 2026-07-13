---
title: Audit Logging
group: Documents
category: Guides
---

# Audit Logging

The eCR Viewer writes audit records for key user, administrative, and eCR access workflows. Audit logging is populated when the Viewer runs in `DUAL` or `NON_INTEGRATED` configurations. In `INTEGRATED` mode, it is the responsibility of the integrating tool to log accesses to the eCRs.

Audit logs are stored in the Viewer metadata database in the `audit_log` table.

## What Gets Logged

The Viewer currently records audit events for:

1. User sign in and sign out.
1. User creation, updates, and deletion.
1. Program area creation, updates, and deletion.
1. eCR list queries, including search, sort, pagination, date, and condition filters passed to the query.
1. eCR creation after the eCR metadata and FHIR data have been saved successfully.
1. eCR viewing by eICR ID.

<<<<<<< HEAD
Each audit event includes:

| Field            | Description                                                                                                        |
| :--------------- | :----------------------------------------------------------------------------------------------------------------- |
| `subject`        | The type of record involved, such as `ecr`, `user`, or `program_area`.                                             |
| `action`         | The action performed, such as `query`, `view`, `create`, `update`, `delete`, `signin`, or `signout`.               |
| `actor`          | The user UUID associated with the request, or an available API/auth token identifier when a user is not available. |
| `date`           | The database-generated timestamp for the audit event.                                                              |
| `parameter_json` | The parameters passed to the audited workflow, such as an eICR ID, user UUID, or eCR search filters.               |
| `metadata_json`  | Additional request metadata. The Viewer currently records the request `User-Agent`.                                |
| `checksum`       | A SHA-256 checksum generated from the audit record contents.                                                       |

=======
The schema for the audit log table can be found in the [database documentation](./Database%20Documentation.md#audit_log-table).

> > > > > > > e58eec9b (update audit log table in db documentation and link to it from audit log docs)

The audit record is written in the same database transaction as the audited action whenever the action uses the standard audit wrapper. This keeps the application change and its audit event together: if the transaction rolls back, the audit record rolls back with it.

## Retention

In order to comply with standards set forth by ONC, audit logs need to be retained for [ten years past the lifetime of the medical record](https://www.astm.org/e2147-18.html#:~:text=at%20least%2010%20years%20or%20for%20two%20years%20after%20the%20legal%20age%20of%20majority%2C%20unless%20a%20longer%20period%20of%20record%20retention%20is%20prescribed%20by%20state%2C%20federal%20or%20other%20law%20or%20regulation.), which in our case, is the length of time the eCR is available in the Viewer.

## Tamper Evidence

The audit log [generates a SHA-256 checksum](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/containers/ecr-viewer/src/app/services/auditLogService.ts#L114-L116) based on author, timestamp, and message contents to determine if there are any changes to the written audit log data.

## Reference Standards

The Viewer audit log is designed to support the audit data elements described in the [ONC Auditable Events and Tamper Resistance test method](https://www.healthit.gov/test-method/auditable-events-and-tamper-resistance), including event time, user identification, patient or eCR identification, action type, and the data accessed.

The [ONC Audit Reports test method](https://www.healthit.gov/test-method/audit-reports) describes expectations for chronological audit review and filtering by start and end date.

Audit data retention should follow [ASTM E2147-18](https://www.astm.org/e2147-18.html#:~:text=at%20least%2010%20years%20or%20for%20two%20years%20after%20the%20legal%20age%20of%20majority%2C%20unless%20a%20longer%20period%20of%20record%20retention%20is%20prescribed%20by%20state%2C%20federal%20or%20other%20law%20or%20regulation.), which includes the 10-year retention requirement.

For tamper-evident records, ONC references hashing strength at least equivalent to SHA-2 in the [Health IT certification criteria final rule](https://www.federalregister.gov/documents/2012/09/04/2012-20982/health-information-technology-standards-implementation-specifications-and-certification-criteria-for#p-890). The Viewer uses SHA-256.

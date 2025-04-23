# eCR Viewer API Documentation

## View eCR

Display an eCR

**URL** : `/ecr-viewer/view-data?id=:id&snomed-code=:snomed&auth=:auth`

**URL Parameters** :

- `id=[string]` where `id` is the ID of the eCR.
- `snomed-code=[string]` where `snomed-code` is the condition the user is viewing the eCR for. OPTIONAL.
- `auth=[string]` where `auth` is the authentication token for the user. Only required if NBS_PUB_KEY is set and other auth not enabled.

**Method** : `GET`

**Auth required** : YES

**Permissions required** : None

### Example Architecture

![NBS -> ECR Viewer sequence diagram](assets/nbs-ecr-viewer-arch.png)

### Success Response

**Condition** : eCR exists and authentication is valid.

**Code** : `200 OK`

**Content** : eCR will be displayed to the user

### Error Responses

**Condition** : eCR does not exist with `id`

**Code** : `404 NOT FOUND`

**Content** : Error will be displayed to user

#### Or

**Condition** : Authentication is invalid

**Code** : `401 UNAUTHORIZED`

**Content** : Error will be displayed to user

## Process eCR zip

Process a zip file containing an eCR/RR pair

**URL** : `/ecr-viewer/api/process-zip`

**POST Form Fields** :

- `upload_file=[File]` where the file is a zip containing an eCR named `CDA_eICR.xml` and optionally a reportability response named `CDA_RR.xml`.
- `return_fhir_bundle=[true|false]` By default, the fhir bundle is not returned. Set this field to `"true"` to have the response include the `bundle` field with the FHIR json object. OPTIONAL.

**Method** : `POST`

**Auth required** : Coming Soon

**Permissions required** : None

### Example

Process an eCR (e.g. `seed-scripts/baseECR/star-wars/yoda-zika-v1-positive`) and have the processed FHIR bundle returned.

```sh
curl --location '<DIBBS_URL>/ecr-viewer/api/process-zip' \
--form 'upload_file=@"<PATH_TO_ECR_ZIP_FILE>";type=application/zip' \
--form 'return_fhir_bundle=true'
```

### Success Response

**Condition** : eCR was processed and saved to storage. If metadata database is enabled, metadata was saved to relational database.

**Code** : `200 OK`

**Content** : `message` and optionally `bundle` if requested

### Error Responses

**Condition** : eCR failed to process or metadata failed to save if enabled

**Code** : `400`

**Content** : `message` with details on error

#### Or

**Condition** : eCR already processed

**Code** : `409 CONFLICT`

**Content** : `message` with details on error

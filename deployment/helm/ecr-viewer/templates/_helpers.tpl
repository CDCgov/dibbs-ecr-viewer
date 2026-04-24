{{/*
Expand the name of the chart.
*/}}
{{- define "ecr-viewer.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "ecr-viewer.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ecr-viewer.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create service account name.
*/}}
{{- define "ecr-viewer.serviceAccountName" -}}
{{- if .Values.serviceAccount }}
{{- default (include "ecr-viewer.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default (include "ecr-viewer.fullname" .) .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create image pull secrets from global settings.
*/}}
{{- define "ecr-viewer.imagePullSecret" -}}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"auth\":\"%s\"}}}" .Values.image.registry .Values.image.registry .Values.image.registry (printf "%s:%s" .Values.image.registry .Values.image.registry | b64enc) | b64enc }}
{{- end }}

{{/*
Create the image path for a service.
Usage: {{ include "ecr-viewer.imagePath" (dict "service" "ecr-viewer" "Values" .Values) }}
*/}}
{{- define "ecr-viewer.imagePath" -}}
{{- $service := default "ecr-viewer" .service }}
{{- printf "%s/%s/%s:%s" .Values.image.registry .Values.image.repository $service .Values.image.tag }}
{{- end }}

{{/*
Create common labels.
*/}}
{{- define "ecr-viewer.commonLabels" -}}
app.kubernetes.io/name: {{ include "ecr-viewer.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "ecr-viewer.chart" . }}
{{- end }}

{{/*
Create pod labels.
*/}}
{{- define "ecr-viewer.podLabels" -}}
{{- include "ecr-viewer.commonLabels" . }}
{{- end }}

{{/*
Create service labels.
*/}}
{{- define "ecr-viewer.serviceLabels" -}}
{{- include "ecr-viewer.commonLabels" . }}
{{- end }}

{{/*
Create deployment labels.
*/}}
{{- define "ecr-viewer.deploymentLabels" -}}
{{- include "ecr-viewer.commonLabels" . }}
{{- end }}

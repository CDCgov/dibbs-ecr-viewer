# eCR Viewer Kubernetes Helm Chart

A Helm chart for deploying the eCR Viewer application to Kubernetes. This chart deploys all 6 services that make up the eCR Viewer application.

## Prerequisites

- Kubernetes 1.19+
- Helm 3+
- An external PostgreSQL database
- Access to a container registry (for custom images)

## Chart Structure

```
deployment/helm/ecr-viewer/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values for all services
├── values-dev.yaml         # Development environment overrides
├── values-prod.yaml        # Production environment overrides
├── templates/              # Kubernetes resource templates
│   ├── _helpers.tpl        # Template helpers
│   ├── configmap.yaml      # Shared configuration
│   ├── secret.yaml         # Sensitive data
│   ├── ingress.yaml        # Ingress resource
│   ├── NOTES.txt           # Post-install notes
│   ├── ecr-viewer-*
│   ├── orchestration-*
│   ├── fhir-converter-*
│   ├── ingestion-*
│   ├── message-parser-*
│   └── trigger-code-reference-*
└── README.md               # This file
```

## Services

This chart deploys the following services:

| Service                | Port                  | Description                    |
| ---------------------- | --------------------- | ------------------------------ |
| ecr-viewer             | 3000                  | Next.js application frontend   |
| orchestration          | 8080                  | FastAPI backend orchestration  |
| fhir-converter         | 8082 (internal: 8080) | FHIR data conversion           |
| ingestion              | 8083 (internal: 8080) | Data ingestion service         |
| message-parser         | 8085 (internal: 8080) | Message parsing service        |
| trigger-code-reference | 8086 (internal: 8080) | Trigger code reference service |

## Installation

### Using default values:

```bash
helm install my-ecr-viewer ./deployment/helm/ecr-viewer/
```

### Using development values:

```bash
helm install my-ecr-viewer ./deployment/helm/ecr-viewer/ -f ./deployment/helm/ecr-viewer/values-dev.yaml
```

### Using production values:

```bash
helm install my-ecr-viewer ./deployment/helm/ecr-viewer/ -f ./deployment/helm/ecr-viewer/values-prod.yaml
```

### With custom database URL:

```bash
helm install my-ecr-viewer ./deployment/helm/ecr-viewer/ \
  --set database.url="postgresql://user:password@host:5432/database"
```

## Configuration

### Global Settings

| Parameter          | Description                | Default        |
| ------------------ | -------------------------- | -------------- |
| `image.registry`   | Container image registry   | `ghcr.io`      |
| `image.repository` | Container image repository | `cdcgov`       |
| `image.tag`        | Container image tag        | `latest`       |
| `image.pullPolicy` | Image pull policy          | `IfNotPresent` |

### Service Configuration

Each service supports the following configuration options:

```yaml
ecr-viewer:
  replicas: 1 # Number of pod replicas
  resources: # CPU and memory limits/requests
    limits:
      cpu: 256m
      memory: 512Mi
    requests:
      cpu: 128m
      memory: 256Mi
  containerPort: 3000 # Port inside the container
  servicePort: 3000 # Port exposed by the service
  healthCheckPath: / # Health check endpoint
  environment: [] # Additional environment variables
```

### Ingress Configuration

```yaml
ingress:
  enabled: true # Enable ingress
  className: "" # Ingress class name
  annotations: {} # Ingress annotations
  hosts: # Host configuration
    - host: ecr-viewer.local
      paths:
        - path: /
          pathType: Prefix
  tls: [] # TLS configuration
```

### Database Configuration

```yaml
database:
  url: "postgresql://user:password@host:5432/database" # Required
```

## Environment-Specific Settings

### Development (`values-dev.yaml`)

- Single replica for each service
- Reduced resource limits
- Development image tag
- Ideal for local testing

### Production (`values-prod.yaml`)

- 2 replicas for high availability
- Full resource allocation
- Production image tag
- Pod disruption budget enabled
- TLS support configured

## Running the Chart

### Build and Push Images

```bash
# Build each service image
docker build -t myregistry/ecr-viewer:latest ./containers/ecr-viewer/
docker build -t myregistry/orchestration:latest ./containers/orchestration/
docker build -t myregistry/fhir-converter:latest ./containers/fhir-converter/
docker build -t myregistry/ingestion:latest ./containers/ingestion/
docker build -t myregistry/message-parser:latest ./containers/message-parser/
docker build -t myregistry/trigger-code-reference:latest ./containers/trigger-code-reference/

# Push to registry
docker push myregistry/ecr-viewer:latest
docker push myregistry/orchestration:latest
docker push myregistry/fhir-converter:latest
docker push myregistry/ingestion:latest
docker push myregistry/message-parser:latest
docker push myregistry/trigger-code-reference:latest/
```

### Install with Custom Registry

```bash
helm install my-ecr-viewer ./deployment/helm/ecr-viewer/ \
  --set image.registry=myregistry \
  --set image.tag=latest \
  --set database.url="postgresql://user:password@host:5432/database"
```

## Verification

### Check Deployments

```bash
kubectl get deployments -l app.kubernetes.io/name=ecr-viewer
```

### Check Services

```bash
kubectl get services -l app.kubernetes.io/name=ecr-viewer
```

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/name=ecr-viewer
```

### View Logs

```bash
kubectl logs -l app.kubernetes.io/component=ecr-viewer -f
```

## Uninstallation

```bash
helm uninstall my-ecr-viewer
```

## Troubleshooting

### Pod not starting

```bash
# Check pod events
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>
```

### Service not responding

```bash
# Check service endpoints
kubectl get endpoints <service-name>

# Test service connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
# Inside the pod:
nslookup <service-name>
```

### Ingress not working

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx controller-nginx-<id>

# Verify ingress resource
kubectl get ingress <ingress-name> -o yaml
```

## License

Copyright © 2025 CDC. Licensed under the MIT License.

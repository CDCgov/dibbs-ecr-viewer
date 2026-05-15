# eCR Viewer - VM Deployment Scripts

Scripts for provisioning and managing an eCR Viewer deployment on an Ubuntu VM.

## Prerequisites

- Ubuntu 24.04 server
- Internet access (scripts download Docker and configuration files)

## Quick Start

```bash
# 1. Download scripts and config (installs to ~/dibbs-ecr-viewer-deployment/)
cd ~ && curl -sSL https://raw.githubusercontent.com/CDCgov/dibbs-ecr-viewer/main/deployment/vm/ecrv-init.sh | bash

# 2. Install Docker
# You can try our script of you can install it yourself.
sudo ./docker-install.sh

# 3. Run update
# Creates a backup of the `dibbs-ecr-viewer-deployment` dir
# Confirms Docker installation
# Triggers `ecrv-wizard.sh` for env var setup
./ecrv-update.sh
```

## Deployment Scripts

### 1. Download scripts - `ecrv-init.sh`

Prerequisites check → config backup → downloads scripts + `.env`/`.yaml` files from GitHub → chmod +x → Docker presence check.

### 2. Install Docker - `docker-install.sh`

Installs Docker Engine, CLI, containerd, buildx, and compose plugin from the official Docker APT repository. Adds the current user to the `docker` group.

### 3. Configure application - `ecrv-update.sh`

Backs up existing config, then prompts to run the interactive wizard. The wizard configures `CONFIG_NAME` (15 provider/database profiles), database connections, cloud storage, auth, and optional settings. On confirmation, writes to `dibbs-ecr-viewer.env`, creates a `.bak` backup, and restarts Docker Compose.

### 4. Other scripts

- `ecrv-wizard.sh`
- Runs the setup wizard, triggered by `ecrv-update.sh`

```bash
./ecrv-wizard.sh
```

- `apt-update.sh`
- Runs apt-get update commands

```bash
./apt-updates.sh -udac   # all: update + upgrade + autoremove + clean
./apt-updates.sh -u      # update only
./apt-updates.sh -h      # help
```

- `condig-backup.sh`
- Creates a backup and ensures the `dibbs-ecr-viewer-deployment` directory is available

```bash
./config-update
```

- `check.sh`
- Runs `shellcheck` on all deployment scripts.

```bash
./check.sh
```

## File Layout

```
~/dibbs-ecr-viewer-deployment/
|-- dibbs-ecr-viewer.env       # active configuration
|-- dibbs-ecr-viewer.bak       # wizard backup
|-- dibbs-ecr-viewer.wizard    # temp file during wizard run
|-- dibbs-orchestration.env    # orchestration config
|-- docker-compose.yaml        # Docker Compose stack

~/
|-- apt-updates.sh
|-- config-backup.sh
|-- docker-install.sh
|-- ecrv-init.sh
|-- ecrv-update.sh
|-- ecrv-wizard.sh
```

## Troubleshooting

- **Docker not installed** - `ecrv-init.sh` warns but continues. Install Docker.
- **Wizard hangs** - requires an interactive terminal. Non-TTY runs block on `read`.

#!/bin/bash

# Use at your own risk. Always review scripts before running them on your system.
#
# If this script doesn't work for you, you can install Docker manually by following the instructions here: https://docs.docker.com/engine/install/ubuntu/
#
# This script installs Docker Engine on an Ubuntu server from the official Docker APT repository.
# The script follows these steps:
#   1. Exports DEBIAN_FRONTEND=noninteractive to suppress apt prompts.
#   2. Updates the package list.
#   3. Creates /etc/apt/keyrings with proper permissions.
#   4. Downloads the Docker GPG key to /etc/apt/keyrings/docker.asc.
#   5. Adds the Docker repository to APT sources.
#   6. Updates the package list again to include the Docker repository.
#   7. Installs Docker packages: docker-ce, docker-ce-cli, containerd.io, docker-buildx-plugin, docker-compose-plugin.
#   8. Adds the current user to the docker group.
#   9. Enables and starts Docker and containerd services.

export DEBIAN_FRONTEND=noninteractive

# --- 1. Update package list ---
echo "[$(date)] Updating package lists..."
apt-get update -qq

# --- 2. Create keyring directory ---
install -m 0755 -d /etc/apt/keyrings

# --- 3. Download Docker GPG key ---
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc

# --- 4. Add Docker repository ---
# shellcheck source=/dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

# --- 5. Update and install Docker ---
echo "[$(date)] Updating package lists again and installing Docker..."
apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

real_user="${SUDO_USER:-$(whoami)}"

# --- 6. Add user to docker group ---
echo "[$(date)] Adjusting Docker group permissions."
groupadd docker 2>/dev/null || true
usermod -aG docker "$real_user"
echo "[$(date)] Note: adding $real_user to docker group. Run 'sg docker -c \"docker info\"' to test, or log out/in for it to take effect."

# --- 7. Enable and start services ---
echo "[$(date)] Enabling Docker and containerd services."
systemctl enable docker.service
systemctl enable containerd.service

# --- 8. Verify service started ---
if ! systemctl is-active --quiet docker.service; then
  echo "[$(date)] ERROR: Docker service failed to start."
  echo "Docker status:"
  systemctl status docker.service
  echo "Journal logs:"
  journalctl -xeu docker.service --no-pager -n 40
  if [ -f /var/log/docker.log ]; then
    echo "[$(date)] Showing last 40 lines of /var/log/docker.log:"
    tail -40 /var/log/docker.log
  fi
  exit 4
fi

systemctl status docker.service
echo "Docker installation complete!"

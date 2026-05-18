#!/usr/bin/env sh
# =============================================================================
# check_packages.sh
# Detects compromised npm/PyPI packages and suspicious router_init.js files.
#
# Strategy:
#   npm  — walks every package.json found inside any node_modules directory
#          and checks the installed name+version against the compromised list.
#          This catches packages present on disk regardless of whether they
#          appear in package.json / package-lock.json.
#   pypi — walks every .dist-info and .egg-info directory found anywhere under
#          the repo root and matches name+version against the compromised list.
#
# Usage:
#   ./check_packages.sh package_file [repo_root]
#
# CSV format (22-packages.csv layout — header row skipped automatically):
#   Ecosystem,Namespace,Name,Version,Artifact,Published,Detected
#
# Arguments:
#   package_file  — path to the CSV file of compromised packages
#   repo_root     — (optional) root directory to scan; defaults to current dir
# =============================================================================

set -eou pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

warn()  { echo -e "${RED}${BOLD}[WARNING]${RESET} $*"; }
info()  { echo -e "${CYAN}[INFO]${RESET}    $*"; }
ok()    { echo -e "${GREEN}[OK]${RESET}      $*"; }
header(){ echo -e "\n${BOLD}${YELLOW}$*${RESET}"; }

# ── Arguments ──────────────────────────────────────────────────────────────────
CSV_FILE="${1:-}"
REPO_ROOT="${2:-.}"

if [[ -z "$CSV_FILE" ]]; then
    echo "Usage: $0 package_file [repo_root]"
    echo ""
    echo "CSV columns: Ecosystem,Namespace,Name,Version,Artifact,Published,Detected"
    exit 1
fi

if [[ ! -f "$CSV_FILE" ]]; then
    echo "Error: CSV file not found: $CSV_FILE"
    exit 1
fi

if [[ ! -d "$REPO_ROOT" ]]; then
    echo "Error: Repo root directory not found: $REPO_ROOT"
    exit 1
fi

REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"

# ── Checksum constant ──────────────────────────────────────────────────────────
#MALICIOUS_CHECKSUM="ab4fcadaec49c03278063dd269ea5eef82d24f2124a8e15d7b90f2fa8601266c"
MALICIOUS_CHECKSUM="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

# =============================================================================
# PART 1 — Build lookup tables from the CSV
# =============================================================================
# Keys are written to two temp files (one per ecosystem) so lookups use
# grep -qxF — fast, and compatible with bash 3.2 (macOS default) where
# associative arrays (declare -A) are not available.
# =============================================================================
 
NPM_LIST="$(mktemp /tmp/check_packages_npm.XXXXXX)"
PYPI_LIST="$(mktemp /tmp/check_packages_pypi.XXXXXX)"
trap 'rm -f "$NPM_LIST" "$PYPI_LIST"' EXIT
 
skipped_ecosystems=0
 
while IFS=',' read -r ecosystem namespace name version _rest; do
    ecosystem="$(echo "$ecosystem" | tr -d '[:space:]\r')"
    namespace="$(echo "$namespace" | tr -d '[:space:]\r')"
    name="$(     echo "$name"      | tr -d '[:space:]\r')"
    version="$(  echo "$version"   | tr -d '[:space:]\r')"
 
    [[ -z "$ecosystem" && -z "$name" ]] && continue
    lower_eco="$(echo "$ecosystem" | tr '[:upper:]' '[:lower:]')"
    [[ "$lower_eco" == "ecosystem" ]] && continue
 
    if [[ "$lower_eco" == "npm" || "$lower_eco" == "js" || "$lower_eco" == "javascript" ]]; then
        if [[ -n "$namespace" ]]; then
            full_name="${namespace}/${name}"
        else
            full_name="$name"
        fi
        echo "${full_name}@${version}" >> "$NPM_LIST"
 
    elif [[ "$lower_eco" == "pypi" || "$lower_eco" == "pip" || "$lower_eco" == "python" ]]; then
        norm_name="$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr '_' '-')"
        echo "${norm_name}==${version}" >> "$PYPI_LIST"
 
    else
        info "Skipping unsupported ecosystem '${ecosystem}' (package: ${namespace:+${namespace}/}${name} ${version})"
        skipped_ecosystems=$(( skipped_ecosystems + 1 ))
    fi
done < "$CSV_FILE"
 
# Deduplicate — the CSV contains many repeated name+version rows
sort -u -o "$NPM_LIST"  "$NPM_LIST"
sort -u -o "$PYPI_LIST" "$PYPI_LIST"
 
npm_total="$( wc -l < "$NPM_LIST"  | tr -d '[:space:]')"
pypi_total="$(wc -l < "$PYPI_LIST" | tr -d '[:space:]')"

# =============================================================================
# PART 2 — Scan installed npm packages (directory-first approach)
# =============================================================================
# For every package.json found inside a node_modules directory, read the
# installed name and version directly from that file and check against the
# lookup table. This finds packages that are physically present on disk but
# not recorded in the project's package.json or package-lock.json.
# =============================================================================

header "═══════════════════════════════════════════════════════"
header " STEP 1: Scanning installed npm packages (node_modules)"
header "═══════════════════════════════════════════════════════"
info "Repo root                       : $REPO_ROOT"
info "Checking for compromised entries: $npm_total npm  |  $pypi_total pypi"
echo ""

pkg_matches=0
npm_scanned=0

if [ "$npm_total" -gt 0 ]; then
    # Find every package.json inside any node_modules tree at any depth.
    while IFS= read -r -d '' pkg_json; do
        npm_scanned=$(( npm_scanned + 1 ))
 
        installed_name="$(grep -m1 '"name"'    "$pkg_json" 2>/dev/null \
                          | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || true)"
        installed_ver="$( grep -m1 '"version"' "$pkg_json" 2>/dev/null \
                          | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || true)"
 
        key="${installed_name}@${installed_ver}"
        if grep -qxF "$key" "$NPM_LIST" 2>/dev/null; then
            pkg_dir="$(dirname "$pkg_json")"
            warn "COMPROMISED npm PACKAGE FOUND!"
            warn "  Package  : ${BOLD}${key}${RESET}"
            warn "  Location : $pkg_dir"
            pkg_matches=$(( pkg_matches + 1 ))
        fi
 
    done < <(
        # Find every package.json nested inside any node_modules tree,
        # at any depth under REPO_ROOT.
        find "$REPO_ROOT" \
            -path "*/node_modules/*/package.json" -type f -print0 \
            2>/dev/null
    )
    info "npm package.json files scanned: $npm_scanned"
else
    info "No npm entries in CSV — skipping npm scan."
fi
 
echo ""
if [ "$pkg_matches" -eq 0 ]; then
    ok "No compromised npm packages detected on disk."
else
    warn "${pkg_matches} compromised npm package(s) found on disk!"
fi

# =============================================================================
# PART 3 — Scan installed PyPI packages (directory-first approach)
# =============================================================================
# For every .dist-info or .egg-info directory found anywhere under the repo
# root, parse the name and version from the directory name itself (which is
# the canonical format pip uses) and check against the lookup table.
# =============================================================================

header "═══════════════════════════════════════════════════════"
header " STEP 2: Scanning installed PyPI packages (site-packages)"
header "═══════════════════════════════════════════════════════"

pypi_matches=0
pypi_scanned=0

if [ "$pypi_total" -gt 0 ]; then
    while IFS= read -r -d '' info_dir; do
        pypi_scanned=$(( pypi_scanned + 1 ))
        dir_base="$(basename "$info_dir")"
 
        # Normalise: lowercase, underscores → hyphens
        norm_base="$(echo "$dir_base" | tr '[:upper:]' '[:lower:]' | tr '_' '-')"
 
        # Strip the .dist-info or .egg-info suffix to get "name-version"
        name_ver="${norm_base%.dist-info}"
        name_ver="${name_ver%.egg-info}"
 
        # Split on the last hyphen-separated version segment.
        # PyPI dist-info format is always <name>-<version> where version
        # starts with a digit.
        inst_ver="${name_ver##*-}"
        inst_name="${name_ver%-${inst_ver}}"
 
        key="${inst_name}==${inst_ver}"
        if grep -qxF "$key" "$PYPI_LIST" 2>/dev/null; then
            warn "COMPROMISED PyPI PACKAGE FOUND!"
            warn "  Package  : ${BOLD}${inst_name}==${inst_ver}${RESET}"
            warn "  Location : $info_dir"
            pypi_matches=$(( pypi_matches + 1 ))
        fi
 
    done < <(find "$REPO_ROOT" \( -type d -name "*.dist-info" -o -type d -name "*.egg-info" \) -print0 2>/dev/null)
 
    info "PyPI info directories scanned: $pypi_scanned"
else
    info "No PyPI entries in CSV — skipping PyPI scan."
fi
 
echo ""
if [ "$pypi_matches" -eq 0 ]; then
    ok "No compromised PyPI packages detected on disk."
else
    warn "${pypi_matches} compromised PyPI package(s) found on disk!"
fi
 
pkg_matches=$(( pkg_matches + pypi_matches ))

# =============================================================================
# PART 4 — Checksum scan for malicious router_init.js
# =============================================================================

header "═══════════════════════════════════════════════════════"
header " STEP 3: Scanning router_init.js files for malicious checksum"
header "═══════════════════════════════════════════════════════"
info "Target checksum : $MALICIOUS_CHECKSUM"
echo ""

checksum_matches=0
router_files=0

while IFS= read -r -d '' rfile; do
    router_files=$(( router_files + 1 ))
    computed="$(shasum -a 256 "$rfile" 2>/dev/null | awk '{print $1}')"

    if [[ "$computed" == "$MALICIOUS_CHECKSUM" ]]; then
        warn "MALICIOUS router_init.js DETECTED!"
        warn "  File     : ${BOLD}$rfile${RESET}"
        warn "  Checksum : $computed"
        checksum_matches=$(( checksum_matches + 1 ))
    else
        info "Clean : $rfile  (sha256: $computed)"
    fi
done < <(find "$REPO_ROOT" -type f -name "router_init.js" -print0 2>/dev/null)

echo ""
if [ "$router_files" -eq 0 ]; then
    info "No router_init.js files found under $REPO_ROOT"
elif [ "$checksum_matches" -eq 0 ]; then
    ok "All $router_files router_init.js file(s) passed the checksum check."
else
    warn "${checksum_matches} of ${router_files} router_init.js file(s) matched the malicious checksum!"
fi

# =============================================================================
# Summary
# =============================================================================
header "═══════════════════════════════════════════════════════"
header " SUMMARY"
header "═══════════════════════════════════════════════════════"
echo -e "  npm packages scanned        : ${BOLD}${npm_scanned}${RESET}"
echo -e "  PyPI packages scanned       : ${BOLD}${pypi_scanned}${RESET}"
echo -e "  Compromised packages found  : ${BOLD}${pkg_matches}${RESET}"
echo -e "  Malicious router_init.js    : ${BOLD}${checksum_matches}${RESET}"
if [ "$skipped_ecosystems" -gt 0 ]; then
    echo -e "  Rows skipped (unsupported)  : ${BOLD}${skipped_ecosystems}${RESET}"
fi
echo ""
 
if [ "$pkg_matches" -gt 0 ] || [ "$checksum_matches" -gt 0 ]; then
    warn "ACTION REQUIRED — Potentially compromised files detected. Review warnings above."
    exit 2
else
    ok "Scan complete — no threats detected."
    exit 0
fi


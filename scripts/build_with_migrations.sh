#!/usr/bin/env bash
set -euo pipefail

echo "[build:deploy] Fuehre Datenbankmigrationen aus ..."
bash scripts/deploy_migrations.sh

echo "[build:deploy] Baue Next.js App ..."
npm run build

echo "[build:deploy] Fertig."

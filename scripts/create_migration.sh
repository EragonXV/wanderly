#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   npm run db:migrate -- add_trip_roles

NAME="${1:-}"

if [[ -z "${NAME}" ]]; then
  echo "[db:migrate] Fehler: Bitte einen Migrationsnamen angeben."
  echo "[db:migrate] Beispiel: npm run db:migrate -- add_trip_roles"
  exit 1
fi

echo "[db:migrate] Erzeuge und wende lokale Migration '${NAME}' an ..."
npx prisma migrate dev --name "${NAME}"

echo "[db:migrate] Fertig."

#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" && -n "${TURSO_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="${TURSO_DATABASE_URL}"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[db:status] Fehler: DATABASE_URL ist nicht gesetzt."
  exit 1
fi

if [[ "${DATABASE_URL}" == https://* ]]; then
  export DATABASE_URL="libsql://${DATABASE_URL#https://}"
fi
if [[ "${DATABASE_URL}" == ligsql://* ]]; then
  export DATABASE_URL="libsql://${DATABASE_URL#ligsql://}"
fi

if [[ -n "${TURSO_AUTH_TOKEN:-}" && "${DATABASE_URL}" != *"authToken="* ]]; then
  ENCODED_TOKEN="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "${TURSO_AUTH_TOKEN}")"
  if [[ "${DATABASE_URL}" == *"?"* ]]; then
    export DATABASE_URL="${DATABASE_URL}&authToken=${ENCODED_TOKEN}"
  else
    export DATABASE_URL="${DATABASE_URL}?authToken=${ENCODED_TOKEN}"
  fi
fi

echo "[db:status] Pruefe Migrationsstatus ..."
npx prisma migrate status

echo "[db:status] Fertig."

#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   npm run db:update
#   DATABASE_URL="libsql://..." npm run db:update
#   npm run db:update -- "libsql://..."
#   TURSO_DATABASE_URL="https://<host>" TURSO_AUTH_TOKEN="<token>" npm run db:update

INPUT_URL="${1:-}"

if [[ -n "${INPUT_URL}" ]]; then
  export DATABASE_URL="${INPUT_URL}"
fi

if [[ -z "${DATABASE_URL:-}" && -n "${TURSO_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="${TURSO_DATABASE_URL}"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[db:update] Fehler: DATABASE_URL ist nicht gesetzt."
  echo ""
  echo "Beispiele:"
  echo "  DATABASE_URL=\"libsql://<host>?authToken=<token>\" npm run db:update"
  echo "  npm run db:update -- \"libsql://<host>?authToken=<token>\""
  echo "  TURSO_DATABASE_URL=\"https://<host>\" TURSO_AUTH_TOKEN=\"<token>\" npm run db:update"
  exit 1
fi

# Normalize common copy/paste mistakes:
# - DATABASE_URL='...'
# - leading/trailing quotes
# - trailing whitespace/newlines
DATABASE_URL="$(printf '%s' "${DATABASE_URL}" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [[ "${DATABASE_URL}" == DATABASE_URL=* ]]; then
  DATABASE_URL="${DATABASE_URL#DATABASE_URL=}"
fi
if [[ "${DATABASE_URL}" == \"*\" ]]; then
  DATABASE_URL="${DATABASE_URL:1:${#DATABASE_URL}-2}"
fi
if [[ "${DATABASE_URL}" == \'*\' ]]; then
  DATABASE_URL="${DATABASE_URL:1:${#DATABASE_URL}-2}"
fi

# Turso URLs from dashboard/CLI are often https://...; Prisma db push expects libsql://...
if [[ "${DATABASE_URL}" == https://* ]]; then
  DATABASE_URL="libsql://${DATABASE_URL#https://}"
fi
if [[ "${DATABASE_URL}" == ligsql://* ]]; then
  DATABASE_URL="libsql://${DATABASE_URL#ligsql://}"
fi

# If token is provided separately, append it in a URL-safe way.
if [[ -n "${TURSO_AUTH_TOKEN:-}" && "${DATABASE_URL}" != *"authToken="* ]]; then
  ENCODED_TOKEN="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "${TURSO_AUTH_TOKEN}")"
  if [[ "${DATABASE_URL}" == *"?"* ]]; then
    DATABASE_URL="${DATABASE_URL}&authToken=${ENCODED_TOKEN}"
  else
    DATABASE_URL="${DATABASE_URL}?authToken=${ENCODED_TOKEN}"
  fi
fi

if [[ "${DATABASE_URL}" != libsql://* && "${DATABASE_URL}" != file:* ]]; then
  echo "[db:update] Fehler: Ungültiges Schema in DATABASE_URL."
  echo "[db:update] Erlaubt sind 'libsql://' (Turso) oder 'file:' (lokal SQLite)."
  echo "[db:update] Aktuell erkannt: ${DATABASE_URL%%:*}://..."
  exit 1
fi

export DATABASE_URL

echo "[db:update] Verwende URL-Schema: ${DATABASE_URL%%:*}://"
echo "[db:update] Fuehre Verbindungscheck aus ..."
node scripts/check_db_connection.js >/dev/null

echo "[db:update] Prisma Client wird generiert ..."
npx prisma generate

if [[ "${DATABASE_URL}" == libsql://* ]]; then
  echo "[db:update] Aktualisiere libSQL/Turso Schema ueber Prisma-Diff + LibSQL Client ..."
  node scripts/apply_libsql_schema_diff.js
else
  echo "[db:update] Datenbankschema wird aktualisiert (prisma db push) ..."
  npx prisma db push
fi

echo "[db:update] Fertig."

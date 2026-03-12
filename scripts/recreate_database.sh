#!/usr/bin/env bash
set -euo pipefail

# WARNING: This script DROPS all existing data.
#
# Usage:
#   npm run db:recreate -- --yes
#   DATABASE_URL="libsql://<host>?authToken=<token>" npm run db:recreate -- --yes
#   TURSO_DATABASE_URL="https://<host>" TURSO_AUTH_TOKEN="<token>" npm run db:recreate -- --yes

CONFIRM="${1:-}"

if [[ "${CONFIRM}" != "--yes" ]]; then
  echo "[db:recreate] Abbruch: Diese Aktion löscht ALLE Daten in der Datenbank."
  echo "[db:recreate] Bitte bewusst ausführen mit: npm run db:recreate -- --yes"
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" && -n "${TURSO_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="${TURSO_DATABASE_URL}"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[db:recreate] Fehler: DATABASE_URL ist nicht gesetzt."
  echo ""
  echo "Beispiele:"
  echo "  DATABASE_URL=\"libsql://<host>?authToken=<token>\" npm run db:recreate -- --yes"
  echo "  TURSO_DATABASE_URL=\"https://<host>\" TURSO_AUTH_TOKEN=\"<token>\" npm run db:recreate -- --yes"
  exit 1
fi

# Normalize common copy/paste mistakes.
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

# Fix common scheme typos and normalize Turso dashboard URL.
if [[ "${DATABASE_URL}" == https://* ]]; then
  DATABASE_URL="libsql://${DATABASE_URL#https://}"
fi
if [[ "${DATABASE_URL}" == ligsql://* ]]; then
  DATABASE_URL="libsql://${DATABASE_URL#ligsql://}"
fi

# Append/escape token if provided separately.
if [[ -n "${TURSO_AUTH_TOKEN:-}" && "${DATABASE_URL}" != *"authToken="* ]]; then
  ENCODED_TOKEN="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "${TURSO_AUTH_TOKEN}")"
  if [[ "${DATABASE_URL}" == *"?"* ]]; then
    DATABASE_URL="${DATABASE_URL}&authToken=${ENCODED_TOKEN}"
  else
    DATABASE_URL="${DATABASE_URL}?authToken=${ENCODED_TOKEN}"
  fi
fi

# Normalize query params (especially authToken).
DATABASE_URL="$(
  node -e '
    const input = process.argv[1];
    try {
      const url = new URL(input);
      const token = url.searchParams.get("authToken");
      if (token !== null) {
        let normalizedToken = token;
        try {
          normalizedToken = decodeURIComponent(token);
        } catch {
          normalizedToken = token;
        }
        url.searchParams.set("authToken", normalizedToken);
      }
      process.stdout.write(url.toString());
    } catch {
      process.stdout.write(input);
    }
  ' "${DATABASE_URL}"
)"

if [[ "${DATABASE_URL}" != libsql://* && "${DATABASE_URL}" != file:* ]]; then
  echo "[db:recreate] Fehler: Ungültiges Schema in DATABASE_URL."
  echo "[db:recreate] Erlaubt sind 'libsql://' (Turso) oder 'file:' (lokal SQLite)."
  echo "[db:recreate] Aktuell erkannt: ${DATABASE_URL%%:*}://..."
  exit 1
fi

export DATABASE_URL

echo "[db:recreate] Verwende URL-Schema: ${DATABASE_URL%%:*}://"
echo "[db:recreate] Prisma Client wird generiert ..."
npx prisma generate

echo "[db:recreate] Datenbank wird vollständig zurückgesetzt ..."
npx prisma db push --force-reset

echo "[db:recreate] Fertig. Die Datenbank wurde neu erstellt."

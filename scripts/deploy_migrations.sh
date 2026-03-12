#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DATABASE_URL="libsql://<host>?authToken=<token>" npm run db:deploy
#   TURSO_DATABASE_URL="https://<host>" TURSO_AUTH_TOKEN="<token>" npm run db:deploy

if [[ -z "${DATABASE_URL:-}" && -n "${TURSO_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="${TURSO_DATABASE_URL}"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[db:deploy] Fehler: DATABASE_URL ist nicht gesetzt."
  exit 1
fi

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
if [[ "${DATABASE_URL}" == https://* ]]; then
  DATABASE_URL="libsql://${DATABASE_URL#https://}"
fi
if [[ "${DATABASE_URL}" == ligsql://* ]]; then
  DATABASE_URL="libsql://${DATABASE_URL#ligsql://}"
fi

if [[ -n "${TURSO_AUTH_TOKEN:-}" && "${DATABASE_URL}" != *"authToken="* ]]; then
  ENCODED_TOKEN="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "${TURSO_AUTH_TOKEN}")"
  if [[ "${DATABASE_URL}" == *"?"* ]]; then
    DATABASE_URL="${DATABASE_URL}&authToken=${ENCODED_TOKEN}"
  else
    DATABASE_URL="${DATABASE_URL}?authToken=${ENCODED_TOKEN}"
  fi
fi

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
  echo "[db:deploy] Fehler: Ungueltige DATABASE_URL."
  exit 1
fi

export DATABASE_URL

echo "[db:deploy] Prisma Client wird generiert ..."
npx prisma generate

echo "[db:deploy] Wende versionierte Migrationen an ..."
npx prisma migrate deploy

echo "[db:deploy] Fertig."

#!/usr/bin/env node
require('dotenv').config();

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@libsql/client');

function maskUrl(input) {
  if (!input) return null;
  return input.replace(/authToken=[^&]+/g, 'authToken=***');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[db:update] Fehler: DATABASE_URL ist nicht gesetzt.');
    process.exit(1);
  }

  const tempFile = path.join(os.tmpdir(), `wanderly-prisma-diff-${Date.now()}.sql`);

  try {
    execFileSync(
      'npx',
      [
        'prisma',
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--script',
        '--output',
        tempFile,
      ],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
      }
    );

    const sql = fs.readFileSync(tempFile, 'utf8').trim();
    if (!sql) {
      console.log('[db:update] Kein SQL-Diff vorhanden. Datenbank ist bereits aktuell.');
      return;
    }

    const client = createClient({ url: databaseUrl });
    try {
      await client.executeMultiple(sql);
    } finally {
      await client.close();
    }

    console.log(`[db:update] SQL-Diff erfolgreich angewendet auf ${maskUrl(databaseUrl)}.`);
  } catch (error) {
    console.error('[db:update] Konnte SQL-Diff nicht anwenden.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

main();

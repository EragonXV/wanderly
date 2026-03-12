#!/usr/bin/env node
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');
const { resolveDatabaseUrl, maskDatabaseUrl } = require('./lib/resolve_database_url');
const { MIGRATIONS_DIR, getMigrationEntries } = require('./lib/sql_migrations');

function sanitizeName(input) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function getTimestamp() {
  const now = new Date();
  const parts = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
    String(now.getUTCSeconds()).padStart(2, '0'),
  ];
  return parts.join('');
}

function isEffectivelyEmptyMigration(sql) {
  const trimmed = sql.trim();
  return trimmed.length === 0 || trimmed === '-- This is an empty migration.';
}

async function main() {
  const rawName = process.argv[2] || 'baseline_from_database';
  const force = process.argv.includes('--force');
  const migrationName = sanitizeName(rawName);

  if (!migrationName) {
    console.error('[db:baseline:create] Bitte einen gueltigen Namen angeben.');
    process.exit(1);
  }

  const existingMigrations = getMigrationEntries().filter((entry) => !isEffectivelyEmptyMigration(entry.sql));
  if (existingMigrations.length > 0 && !force) {
    console.error('[db:baseline:create] Abbruch: Es existieren bereits nicht-leere Migrationen.');
    console.error('[db:baseline:create] Fuer eine echte DB-Baseline solltest du die bestehende Baseline-Historie bewusst ersetzen.');
    console.error('[db:baseline:create] Verwende --force nur, wenn du das absichtlich in einem Branch vorbereitest.');
    process.exit(1);
  }

  const databaseUrl = resolveDatabaseUrl();
  const client = createClient({ url: databaseUrl });

  try {
    const result = await client.execute(`
      SELECT type, name, tbl_name, sql
      FROM sqlite_master
      WHERE sql IS NOT NULL
        AND name NOT LIKE 'sqlite_%'
        AND name != '_WanderlySqlMigrations'
      ORDER BY
        CASE type
          WHEN 'table' THEN 1
          WHEN 'index' THEN 2
          WHEN 'trigger' THEN 3
          WHEN 'view' THEN 4
          ELSE 5
        END,
        name ASC
    `);

    const statements = result.rows
      .map((row) => String(row.sql || '').trim())
      .filter((sql) => sql.length > 0)
      .map((sql) => `${sql.endsWith(';') ? sql : `${sql};`}`);

    if (statements.length === 0) {
      console.error('[db:baseline:create] Keine DB-Objekte gefunden.');
      process.exit(1);
    }

    const directoryName = `${getTimestamp()}_${migrationName}`;
    const targetDirectory = path.join(MIGRATIONS_DIR, directoryName);
    fs.mkdirSync(targetDirectory, { recursive: true });

    const header = [
      '-- Baseline migration generated from existing database state.',
      `-- Source: ${maskDatabaseUrl(databaseUrl)}`,
      '',
    ].join('\n');

    fs.writeFileSync(
      path.join(targetDirectory, 'migration.sql'),
      `${header}${statements.join('\n\n')}\n`
    );

    console.log(`[db:baseline:create] Erstellt: prisma/migrations/${directoryName}/migration.sql`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[db:baseline:create] Fehlgeschlagen.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

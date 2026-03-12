#!/usr/bin/env node
require('dotenv').config();

const { maskDatabaseUrl } = require('./lib/resolve_database_url');
const {
  getClient,
  getMigrationEntries,
  getAppliedMigrations,
  recordMigrationAsApplied,
} = require('./lib/sql_migrations');

async function main() {
  const migrations = getMigrationEntries();
  const { client, url } = await getClient();

  try {
    const applied = await getAppliedMigrations(client);
    const appliedByName = new Map(applied.map((entry) => [entry.name, entry]));

    for (const migration of migrations) {
      if (!appliedByName.has(migration.name)) {
        console.log(`[db:baseline] Marking ${migration.name} as applied on ${maskDatabaseUrl(url)}`);
        await recordMigrationAsApplied(client, migration);
      }
    }

    console.log('[db:baseline] Done.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[db:baseline] Failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

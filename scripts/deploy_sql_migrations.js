#!/usr/bin/env node
require('dotenv').config();

const { maskDatabaseUrl } = require('./lib/resolve_database_url');
const {
  getClient,
  getMigrationEntries,
  getAppliedMigrations,
  applyMigration,
} = require('./lib/sql_migrations');

async function main() {
  const migrations = getMigrationEntries();
  const { client, url } = await getClient();

  try {
    const applied = await getAppliedMigrations(client);
    const appliedByName = new Map(applied.map((entry) => [entry.name, entry]));

    for (const migration of migrations) {
      const existing = appliedByName.get(migration.name);
      if (existing) {
        if (existing.checksum !== migration.checksum) {
          throw new Error(`Migration checksum mismatch for ${migration.name}`);
        }
        continue;
      }

      console.log(`[db:deploy] Applying ${migration.name} to ${maskDatabaseUrl(url)}`);
      await applyMigration(client, migration);
    }

    console.log('[db:deploy] All SQL migrations applied.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[db:deploy] Failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

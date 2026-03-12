#!/usr/bin/env node
require('dotenv').config();

const { maskDatabaseUrl } = require('./lib/resolve_database_url');
const {
  getClient,
  getMigrationEntries,
  getAppliedMigrations,
} = require('./lib/sql_migrations');

async function main() {
  const migrations = getMigrationEntries();
  const { client, url } = await getClient();

  try {
    const applied = await getAppliedMigrations(client);
    const appliedByName = new Map(applied.map((entry) => [entry.name, entry]));

    const pending = migrations.filter((migration) => !appliedByName.has(migration.name));

    console.log(`[db:status] Database: ${maskDatabaseUrl(url)}`);
    console.log(`[db:status] Applied: ${applied.length}`);
    console.log(`[db:status] Pending: ${pending.length}`);

    if (pending.length > 0) {
      for (const migration of pending) {
        console.log(`- ${migration.name}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[db:status] Failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@libsql/client');
const { resolveDatabaseUrl } = require('./resolve_database_url');

const MIGRATIONS_DIR = path.resolve('prisma/migrations');
const MIGRATION_TABLE = '_WanderlySqlMigrations';

function getMigrationDirectories() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getMigrationEntries() {
  return getMigrationDirectories()
    .map((directoryName) => {
      const filePath = path.join(MIGRATIONS_DIR, directoryName, 'migration.sql');
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      return {
        name: directoryName,
        filePath,
        sql,
        checksum,
      };
    })
    .filter(Boolean);
}

async function getClient() {
  const url = resolveDatabaseUrl();
  const client = createClient({ url });
  return { client, url };
}

async function ensureMigrationTable(client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "${MIGRATION_TABLE}" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getAppliedMigrations(client) {
  await ensureMigrationTable(client);
  const result = await client.execute(`SELECT name, checksum, appliedAt FROM "${MIGRATION_TABLE}" ORDER BY name ASC`);
  return result.rows.map((row) => ({
    name: String(row.name),
    checksum: String(row.checksum),
    appliedAt: String(row.appliedAt),
  }));
}

async function applyMigration(client, migration) {
  const escapedName = migration.name.replace(/'/g, "''");
  const escapedChecksum = migration.checksum.replace(/'/g, "''");
  await client.executeMultiple(`
    BEGIN;
    ${migration.sql}
    INSERT INTO "${MIGRATION_TABLE}" ("name", "checksum") VALUES ('${escapedName}', '${escapedChecksum}');
    COMMIT;
  `);
}

async function recordMigrationAsApplied(client, migration) {
  const escapedName = migration.name.replace(/'/g, "''");
  const escapedChecksum = migration.checksum.replace(/'/g, "''");
  await client.execute(`
    INSERT OR REPLACE INTO "${MIGRATION_TABLE}" ("name", "checksum") VALUES ('${escapedName}', '${escapedChecksum}')
  `);
}

module.exports = {
  MIGRATIONS_DIR,
  MIGRATION_TABLE,
  getMigrationEntries,
  getClient,
  getAppliedMigrations,
  ensureMigrationTable,
  applyMigration,
  recordMigrationAsApplied,
};

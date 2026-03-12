#!/usr/bin/env node
require('dotenv').config();

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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

function main() {
  const rawName = process.argv[2];
  const migrationName = rawName ? sanitizeName(rawName) : '';
  if (!migrationName) {
    console.error('[db:migrate] Please provide a migration name.');
    process.exit(1);
  }

  const tempOutput = path.join(os.tmpdir(), `wanderly-migration-${Date.now()}.sql`);

  execFileSync(
    'npx',
    [
      'prisma',
      'migrate',
      'diff',
      '--from-migrations',
      'prisma/migrations',
      '--to-schema',
      'prisma/schema.prisma',
      '--script',
      '--output',
      tempOutput,
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'file:./dev.db',
      },
    }
  );

  const sql = fs.readFileSync(tempOutput, 'utf8').trim();
  fs.rmSync(tempOutput, { force: true });

  if (!sql) {
    console.log('[db:migrate] No schema changes detected.');
    return;
  }

  const directoryName = `${getTimestamp()}_${migrationName}`;
  const targetDirectory = path.join('prisma', 'migrations', directoryName);
  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.writeFileSync(path.join(targetDirectory, 'migration.sql'), `${sql}\n`);

  console.log(`[db:migrate] Created prisma/migrations/${directoryName}/migration.sql`);
}

main();

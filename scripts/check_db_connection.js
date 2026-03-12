#!/usr/bin/env node
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { resolveDatabaseUrl, maskDatabaseUrl } = require('./lib/resolve_database_url');

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  const adapter = new PrismaLibSql({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const [users, trips] = await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
    ]);

    console.log(JSON.stringify({
      ok: true,
      databaseUrl: maskDatabaseUrl(databaseUrl),
      users,
      trips,
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      databaseUrl: maskDatabaseUrl(databaseUrl),
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' && 'code' in error ? error.code : null,
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

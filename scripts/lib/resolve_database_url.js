const path = require('node:path');

function stripWrappingQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function resolveDatabaseUrl() {
  let databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:./dev.db';
  databaseUrl = String(databaseUrl).replace(/\r/g, '').trim();

  if (databaseUrl.startsWith('DATABASE_URL=')) {
    databaseUrl = databaseUrl.slice('DATABASE_URL='.length);
  }

  databaseUrl = stripWrappingQuotes(databaseUrl);

  if (databaseUrl.startsWith('https://')) {
    databaseUrl = `libsql://${databaseUrl.slice('https://'.length)}`;
  }

  if (databaseUrl.startsWith('ligsql://')) {
    databaseUrl = `libsql://${databaseUrl.slice('ligsql://'.length)}`;
  }

  if (process.env.TURSO_AUTH_TOKEN && !databaseUrl.includes('authToken=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}authToken=${encodeURIComponent(process.env.TURSO_AUTH_TOKEN)}`;
  }

  if (databaseUrl.startsWith('file:./')) {
    const relativePath = databaseUrl.slice('file:'.length);
    const absolutePath = path.resolve(relativePath);
    return `file:${absolutePath}`;
  }

  return databaseUrl;
}

function maskDatabaseUrl(databaseUrl) {
  return databaseUrl.replace(/authToken=[^&]+/g, 'authToken=***');
}

module.exports = {
  resolveDatabaseUrl,
  maskDatabaseUrl,
};

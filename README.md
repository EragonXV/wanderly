## Development

Start the development server:

```bash
npm run dev
```

The local Prisma datasource is configured via `.env` and defaults to `file:./dev.db`.

## Database Workflow

This project now uses versioned Prisma migrations.

Create a local migration after editing `prisma/schema.prisma`:

```bash
npm run db:migrate -- add_some_change
```

Check migration status against a target database:

```bash
DATABASE_URL="libsql://<host>?authToken=<token>" npm run db:status
```

Apply committed migrations on staging/production:

```bash
DATABASE_URL="libsql://<host>?authToken=<token>" npm run db:deploy
```

For Turso you can also provide the variables separately:

```bash
TURSO_DATABASE_URL="https://<host>.turso.io" TURSO_AUTH_TOKEN="<token>" npm run db:deploy
```

Build the app with migrations applied first:

```bash
npm run build:deploy
```

The deployment scripts use the existing `DATABASE_URL` environment variable directly.

Recommended production setup:

- Commit every Prisma migration in `prisma/migrations`.
- Set your hosting build command to `npm run build:deploy`.
- Do not use `prisma db push` in production unless you intentionally want an unmanaged schema change.

## First Baseline

The repository includes a baseline migration in [prisma/migrations/20260312000000_init/migration.sql](/Users/Frederick.Pokoj/Projects/wanderly/prisma/migrations/20260312000000_init/migration.sql). New environments should use `npm run db:deploy` instead of manual schema updates.

## Notes

- Existing production databases that were previously managed manually may still need a one-time reset or a one-time manual alignment before `migrate deploy` can take over cleanly.
- If a production database already contains tables but no Prisma migration history, baseline it first before relying on automated deploy migrations.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Migrate Documentation](https://www.prisma.io/docs/orm/prisma-migrate)

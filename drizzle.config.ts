import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/api/src/shared/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/yomu',
  },
  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations__',
    schema: 'public',
  },
  verbose: true,
  strict: true,
});

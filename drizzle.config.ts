import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  dbCredentials: {
    // Neon Free: postgresql://...?sslmode=require
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/chillout',
  },
})

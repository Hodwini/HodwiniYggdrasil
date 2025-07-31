import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schemas/',
  out: './drizzle',
  dbCredentials: {
    host: Bun.env.DB_HOST || 'localhost',
    port: Number(Bun.env.DB_PORT) || 5432,
    user: Bun.env.DB_USERNAME || 'postgres',
    password: Bun.env.DB_PASSWORD || '',
    database: Bun.env.DB_NAME || 'typedrasil-dev',
    ssl: false
  },
  verbose: true,
  strict: true,
})
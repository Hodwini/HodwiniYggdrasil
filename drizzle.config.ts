import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schemas/',
  out: './drizzle',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'your_db',
    ssl: false
  },
  verbose: true,
  strict: true,
});
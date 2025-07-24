import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { profiles } from "./schemas/profiles";
import { gameSessions } from "./schemas/sessions";
import { skins } from "./schemas/skins";
import { accessTokens } from "./schemas/tokens";
import { users } from "./schemas/users";

const pool = new Pool({
  connectionString: Bun.env.DB_HOST!,
});

export const db = drizzle(pool, {
    schema: {
        ...profiles,
        ...gameSessions,
        ...skins,
        ...accessTokens,
        ...users,
    },
});

export type Database = typeof db;
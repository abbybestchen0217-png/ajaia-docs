import { Pool } from "pg";

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool = globalForPool.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

if (process.env.NODE_ENV !== "production") globalForPool.pool = pool;

export const prisma = {
  user: {
    findMany: () => pool.query('SELECT * FROM "User"').then(r => r.rows),
  },
};
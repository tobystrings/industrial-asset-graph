import pg from 'pg';

const { Pool } = pg;

export function databaseUrl(): string {
  return process.env.IAG_DATABASE_URL ?? 'postgres://iag:iag-development-only@127.0.0.1:54329/industrial_asset_graph';
}

export const pool = new Pool({ connectionString: databaseUrl(), max: 10 });

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import pg from 'pg'

const schema = `
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS sheets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, campaign TEXT NOT NULL DEFAULT '', data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
  CREATE INDEX IF NOT EXISTS sheets_owner_updated ON sheets(user_id, updated_at);`

export async function openDatabase({ database, databaseUrl, production = false }) {
  if (!databaseUrl) {
    if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true, mode: 0o700 })
    const db = new DatabaseSync(database)
    try {
      db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;')
      db.exec(schema)
      return db
    } catch (error) { db.close(); throw error }
  }
  const url = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw Error('DATABASE_URL deve ser uma conexão PostgreSQL.')
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  // Never allow a URL option to disable certificate verification for a remote DB.
  for (const option of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(option)
  const pool = new pg.Pool({ connectionString: url.toString(), ssl: production || !local ? { rejectUnauthorized: true } : false, enableChannelBinding: true, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 20_000, query_timeout: 20_000 })
  pool.on('error', () => console.error('Conexão com o banco interrompida; uma nova conexão será tentada na próxima operação.'))
  try { await pool.query(schema) } catch (error) { await pool.end(); throw error }
  return {
    prepare(sql) {
      let index = 0
      const statement = sql.replaceAll('?', () => `$${++index}`)
      return {
        async get(...values) { return (await pool.query(statement, values)).rows[0] },
        async all(...values) { return (await pool.query(statement, values)).rows },
        async run(...values) { return { changes: (await pool.query(statement, values)).rowCount } },
      }
    },
    exec(sql) { return pool.query(sql) },
    close() { return pool.end() },
  }
}

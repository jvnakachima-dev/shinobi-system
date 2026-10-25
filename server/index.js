import http from 'node:http'
import { openDatabase } from './database.js'
import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { createReadStream, statSync } from 'node:fs'
import { createGzip } from 'node:zlib'
import { dirname, resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scrypt = promisify(derive)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fail = (status, message) => Object.assign(new Error(message), { status })
const hash = value => createHash('sha256').update(value).digest('hex')
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createApp({ database = resolve(root, 'data/shinobi.sqlite'), databaseUrl, production = false, appOrigin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL } = {}) {
  if (appOrigin) {
    const parsed = new URL(appOrigin)
    if (parsed.origin !== appOrigin || (production && parsed.protocol !== 'https:')) throw Error('A origem pública deve ser uma URL HTTPS sem caminho nem barra final.')
  }
  const db = await openDatabase({ database, databaseUrl, production })
  const attempts = new Map()
  const sessionDuration = 7 * 24 * 60 * 60 * 1000
  function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)) }
  async function body(req) {
    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw fail(415, 'Envie dados em JSON.')
    let data = ''
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      // A 2.5 MB portrait expands to about 3.34 MB when encoded as base64.
      if (size > 5_000_000) throw fail(413, 'A ficha ultrapassou o limite total de 5 MB.')
      data += chunk
    }
    try { return JSON.parse(data) } catch { throw fail(400, 'Dados inválidos.') }
  }
  async function user(req) {
    const cookie = (req.headers.cookie ?? '').split(';').map(v => v.trim()).find(v => v.startsWith('shinobi_session='))?.slice(16)
    if (!cookie) return null
    return (await db.prepare('SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(hash(cookie), Date.now())) ?? null
  }
  async function setSession(res, userId) {
    await db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now())
    const token = randomBytes(32).toString('hex')
    await db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token), userId, Date.now() + sessionDuration)
    res.setHeader('Set-Cookie', `shinobi_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionDuration / 1000}${production ? '; Secure' : ''}`)
  }
  function validateSheet(input) {
    const s = input?.data
    if (!s || typeof s !== 'object' || Array.isArray(s) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 100 || !Number.isInteger(Number(s.level)) || Number(s.level) < 1 || Number(s.level) > 20) throw fail(400, 'Informe um nome e nível de 1 a 20.')
    if (typeof s.sessionName !== 'string' || !s.sessionName.trim() || s.sessionName.length > 100) throw fail(400, 'Informe o nome do encontro (até 100 caracteres).')
    for (const key of ['attributes', 'skills', 'pv', 'chakra']) if (!s[key] || typeof s[key] !== 'object' || Array.isArray(s[key])) throw fail(400, 'Ficha incompleta.')
    for (const key of ['FOR', 'DEX', 'CON', 'INT', 'ART', 'CAR']) if (!Number.isFinite(s.attributes[key]) || s.attributes[key] < 0 || s.attributes[key] > 100) throw fail(400, 'Os atributos devem estar entre 0 e 100.')
    for (const key of ['pv', 'chakra']) if (!Number.isFinite(s[key].current) || s[key].current < 0 || !Number.isFinite(s[key].max) || s[key].max < 1 || s[key].max > 99999) throw fail(400, 'Informe recursos válidos e máximos de 1 a 99999.')
    for (const key of ['jutsus', 'rollHistory', 'customAbilities']) if (!Array.isArray(s[key])) throw fail(400, 'Ficha incompleta.')
    if (typeof input.campaign !== 'string' || input.campaign.length > 100) throw fail(400, 'A mesa deve ter até 100 caracteres.')
    return { data: JSON.stringify({ ...s, name: s.name.trim() }), campaign: input.campaign.trim() }
  }
  const unpack = row => ({ ...row, data: JSON.parse(row.data) })
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'same-origin')
    if (production) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000')
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
    }
    try {
      const url = new URL(req.url, 'http://local')
      const path = url.pathname
      if (!path.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Método não permitido.')
        const base = '/shinobi-system/'
        if (path === '/') { res.writeHead(302, { Location: base }); res.end(); return }
        if (!path.startsWith(base)) throw fail(404, 'Página não encontrada.')
        const dist = resolve(root, 'dist')
        let file = resolve(dist, decodeURIComponent(path.slice(base.length)) || 'index.html')
        if (!file.startsWith(dist + sep)) throw fail(404, 'Página não encontrada.')
        try { if (!statSync(file).isFile()) throw Error() } catch { throw fail(404, 'Arquivo não encontrado. Execute npm run build.') }
        const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml' }
        const compress = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && ['.html', '.js', '.css', '.svg'].includes(extname(file))
        const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': path.startsWith(base + 'assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', Vary: 'Accept-Encoding' }
        if (compress) headers['Content-Encoding'] = 'gzip'
        res.writeHead(200, headers)
        if (req.method === 'HEAD') res.end()
        else {
          const stream = createReadStream(file)
          stream.on('error', () => res.destroy())
          if (compress) { const gzip = createGzip(); gzip.on('error', () => res.destroy()); stream.pipe(gzip).pipe(res) }
          else stream.pipe(res)
        }
        return
      }
      if (req.method !== 'GET') {
        const origin = req.headers.origin
        const expected = appOrigin || `${production ? 'https' : 'http'}://${req.headers.host}`
        if (origin && origin !== expected) throw fail(403, 'Origem não permitida.')
        if (req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Origem não permitida.')
      }
      if (path === '/api/health' && req.method === 'GET') { await db.prepare('SELECT 1').get(); send(res, 200, { ok: true }); return }
      if (['/api/register','/api/login'].includes(path) && req.method === 'POST') {
        const input = await body(req)
        const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : ''
        // Separate accounts behind the hosting proxy must not share one limit.
        // The account limit also protects logins even when clients rotate IPs.
        const key = hash(email)
        const now = Date.now()
        for (const [address, entry] of attempts) if (entry.until <= now) attempts.delete(address)
        const entry = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 }
        if (++entry.count > 30) { res.setHeader('Retry-After', String(Math.ceil((entry.until - now) / 1000))); throw fail(429, 'Muitas tentativas para esta conta. Aguarde 15 minutos.') }
        attempts.set(key, entry)
        if (!emailPattern.test(email) || email.length > 254 || typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 128) throw fail(400, 'Informe um e-mail válido e senha de 10 a 128 caracteres.')
        let account
        if (path === '/api/register') {
          const name = typeof input.name === 'string' ? input.name.trim() : ''
          if (!name || name.length > 80) throw fail(400, 'Informe seu nome (até 80 caracteres).')
          const salt = randomBytes(16).toString('hex')
          const password = `${salt}:${(await scrypt(input.password, salt, 64)).toString('hex')}`
          account = { id: randomBytes(16).toString('hex'), email, name }
          try { await db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(account.id, email, name, password) } catch (e) { if (e.code === '23505' || e.message.includes('UNIQUE')) throw fail(409, 'Não foi possível cadastrar esse e-mail. Tente entrar.'); throw e }
        } else {
          const stored = await db.prepare('SELECT * FROM users WHERE email=?').get(email)
          const [salt, expected] = stored?.password.split(':') ?? ['invalid', '00'.repeat(64)]
          const actual = await scrypt(input.password, salt, 64)
          if (!stored || !timingSafeEqual(actual, Buffer.from(expected, 'hex'))) throw fail(401, 'E-mail ou senha incorretos.')
          account = { id: stored.id, email: stored.email, name: stored.name }
        }
        await setSession(res, account.id)
        send(res, path === '/api/register' ? 201 : 200, { user: account }); return
      }
      const account = await user(req)
      if (!account) throw fail(401, 'Entre na sua conta para continuar.')
      if (path === '/api/me' && req.method === 'GET') { send(res, 200, { user: account }); return }
      if (path === '/api/logout' && req.method === 'POST') {
        const token = (req.headers.cookie ?? '').split(';').map(v => v.trim()).find(v => v.startsWith('shinobi_session='))?.slice(16)
        if (token) await db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token))
        res.setHeader('Set-Cookie', `shinobi_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${production ? '; Secure' : ''}`)
        send(res, 200, { ok: true }); return
      }
      if (path === '/api/sheets' && req.method === 'GET') {
        send(res, 200, { sheets: (await db.prepare('SELECT id,campaign,data,revision,updated_at FROM sheets WHERE user_id=? ORDER BY updated_at DESC').all(account.id)).map(unpack) }); return
      }
      if (path === '/api/sheets' && req.method === 'POST') {
        const data = validateSheet(await body(req))
        const id = randomBytes(16).toString('hex')
        await db.prepare('INSERT INTO sheets (id,user_id,campaign,data,updated_at) VALUES (?,?,?,?,?)').run(id, account.id, data.campaign, data.data, new Date().toISOString())
        send(res, 201, { sheet: unpack(await db.prepare('SELECT id,campaign,data,revision,updated_at FROM sheets WHERE id=?').get(id)) }); return
      }
      const id = path.match(/^\/api\/sheets\/([a-f0-9]{32})$/)?.[1]
      if (id && ['PUT','DELETE'].includes(req.method)) {
        if (!(await db.prepare('SELECT id FROM sheets WHERE id=? AND user_id=?').get(id, account.id))) throw fail(404, 'Ficha não encontrada.')
        if (req.method === 'DELETE') { await db.prepare('DELETE FROM sheets WHERE id=? AND user_id=?').run(id, account.id); send(res, 200, { ok: true }); return }
        const input = await body(req)
        const data = validateSheet(input)
        const result = await db.prepare('UPDATE sheets SET data=?,campaign=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=?').run(data.data, data.campaign, new Date().toISOString(), id, account.id, Number(input.revision))
        if (!result.changes) throw fail(409, 'Esta ficha foi alterada em outra aba ou máquina. Guarde suas alterações antes de reabrir a versão atual.')
        send(res, 200, { sheet: unpack(await db.prepare('SELECT id,campaign,data,revision,updated_at FROM sheets WHERE id=? AND user_id=?').get(id, account.id)) }); return
      }
      throw fail(404, 'Recurso não encontrado.')
    } catch (e) { if (!e.status) console.error('Falha na operação do servidor:', e.code || e.name); if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Erro interno. Tente novamente.' }); else res.end() }
  })
  server.requestTimeout = 30_000
  server.headersTimeout = 15_000
  return { server, db }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const production = process.env.NODE_ENV === 'production'
  if (production && !process.env.DATABASE_URL) throw Error('Defina DATABASE_URL com o PostgreSQL persistente antes de iniciar em produção.')
  if (production && !process.env.APP_ORIGIN && !process.env.RENDER_EXTERNAL_URL) throw Error('Defina APP_ORIGIN com a origem HTTPS pública.')
  const { server, db } = await createApp({ database: process.env.DATABASE_PATH || undefined, databaseUrl: process.env.DATABASE_URL, production })
  server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log('Shinobi API iniciada.'))
  let stopping = false
  const shutdown = () => {
    if (stopping) return
    stopping = true
    const timer = setTimeout(() => process.exit(1), 15_000).unref()
    server.close(async () => { await db.close(); clearTimeout(timer) })
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

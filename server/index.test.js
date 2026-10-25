import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './index.js'
import { randomUUID } from 'node:crypto'

const sheet = { sheetVersion: 3, name: 'Yuta teste', sessionName: 'Encontro 1', level: 1, attributes: { FOR: 20, DEX: 20, CON: 20, INT: 20, ART: 20, CAR: 20 }, skills: {}, pv: { current: 21, max: 21 }, chakra: { current: 41, max: 41 }, jutsus: [], rollHistory: [], customAbilities: [], notes: 'Primeira aventura' }
const backends = [{ name: 'SQLite', url: undefined }]
if (process.env.TEST_DATABASE_URL) {
  if (!new URL(process.env.TEST_DATABASE_URL).pathname.includes('test')) throw Error('TEST_DATABASE_URL deve apontar para um banco de teste separado.')
  backends.push({ name: 'PostgreSQL', url: process.env.TEST_DATABASE_URL })
}
for (const backend of backends) {
test(`${backend.name}: accounts, private sheets, session copies, conflicts, logout and persistence`, async () => {
  const emailA = `a-${randomUUID()}@example.com`
  const emailB = `b-${randomUUID()}@example.com`
  const dir = mkdtempSync(join(tmpdir(), 'shinobi-test-'))
  const database = join(dir, 'test.sqlite')
  const options = { database, databaseUrl: backend.url }
  let app = await createApp(options)
  async function start() { await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${app.server.address().port}` }
  let base = await start()
  async function request(path, method = 'GET', data, cookie, headers = {}) {
    const res = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, body: data === undefined ? undefined : JSON.stringify(data) })
    return { status: res.status, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] }
  }
  const stop = async () => { await new Promise(resolve => app.server.close(resolve)); await app.db.close() }
  try {
    assert.equal((await request('/sheets')).status, 401)
    assert.equal((await request('/register','POST',{name:'A',email:emailA,password:'short'})).status, 400)
    const a = await request('/register','POST',{name:'A',email:emailA,password:'test-password-123'})
    assert.equal(a.status,201); assert.match(a.cookie,/shinobi_session=/)
    const b = await request('/register','POST',{name:'B',email:emailB,password:'other-password-123'})
    assert.equal(b.status,201)
    assert.equal((await request('/me','GET',undefined,a.cookie)).data.user.email,emailA)
    const stored = (await app.db.prepare('SELECT password FROM users WHERE email=?').get(emailA)).password
    assert.ok(!stored.includes('test-password-123'))
    assert.equal((await request('/login','POST',{email:emailA,password:'wrong-password-123'})).status,401)
    assert.equal((await request('/sheets','POST',{data:sheet,campaign:'Konoha'},a.cookie, {Origin:'https://evil.test'})).status,403)
    assert.equal((await request('/sheets','POST',{data:{name:'Broken'},campaign:''},a.cookie)).status,400)
    const created = await request('/sheets','POST',{data:sheet,campaign:'Konoha'},a.cookie)
    assert.equal(created.status,201)
    const id = created.data.sheet.id
    assert.equal((await request('/sheets','GET',undefined,b.cookie)).data.sheets.length,0)
    assert.equal((await request(`/sheets/${id}`,'DELETE',undefined,b.cookie)).status,404)
    assert.equal((await request(`/sheets/${id}`,'PUT',{data:sheet,campaign:'',revision:1},b.cookie)).status,404)
    const copyData = {...sheet,sessionName:'Encontro 2',previousSheetId:id,pv:{current:10,max:21}}
    const copy = await request('/sheets','POST',{data:copyData,campaign:'Konoha'},a.cookie)
    assert.equal(copy.status,201)
    const changed = {...copyData,notes:'Segunda aventura'}
    assert.equal((await request(`/sheets/${copy.data.sheet.id}`,'PUT',{data:changed,campaign:'Konoha',revision:1},a.cookie)).status,200)
    assert.equal((await request(`/sheets/${copy.data.sheet.id}`,'PUT',{data:copyData,campaign:'Konoha',revision:1},a.cookie)).status,409)
    const list = (await request('/sheets','GET',undefined,a.cookie)).data.sheets
    assert.equal(list.length,2)
    assert.equal(list.find(s=>s.id===id).data.pv.current,21)
    assert.equal(list.find(s=>s.id===id).data.notes,'Primeira aventura')
    assert.equal(list.find(s=>s.id===copy.data.sheet.id).data.notes,'Segunda aventura')
    await stop(); app=await createApp(options); base=await start()
    assert.equal((await request('/sheets','GET',undefined,a.cookie)).data.sheets.length,2)
    assert.equal((await request(`/sheets/${copy.data.sheet.id}`,'DELETE',undefined,a.cookie)).status,200)
    assert.equal((await request('/sheets','GET',undefined,a.cookie)).data.sheets.length,1)
    assert.equal((await request('/logout','POST',undefined,a.cookie)).status,200)
    assert.equal((await request('/sheets','GET',undefined,a.cookie)).status,401)
    assert.equal((await request('/login','POST',{email:emailA,password:'test-password-123'})).status,200)
  } finally { await stop(); rmSync(dir,{recursive:true,force:true}) }
})

}

test('expired sessions cannot read private data and production cookies are secure', async () => {
  const app=await createApp({database:':memory:',production:true})
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve))
  const base=`http://127.0.0.1:${app.server.address().port}`
  try {
    const res=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'A',email:'secure@example.com',password:'test-password-123'})})
    assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/)
    assert.ok(res.headers.get('strict-transport-security'))
    const cookie=res.headers.get('set-cookie')
    assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Secure/)
    await app.db.exec('UPDATE sessions SET expires=0')
    assert.equal((await fetch(base+'/api/sheets',{headers:{cookie:cookie.split(';')[0]}})).status,401)
  } finally {await new Promise(resolve=>app.server.close(resolve));await app.db.close()}
})


test('public origin rejects insecure production configuration', async () => {
  await assert.rejects(createApp({ database: ':memory:', production: true, appOrigin: 'http://example.com' }), /HTTPS/)
  await assert.rejects(createApp({ database: ':memory:', production: true, appOrigin: 'https://example.com/path' }), /origem/)
})

test('authentication limits are per account and do not block other accounts behind one proxy', async () => {
  const app = await createApp({ database: ':memory:' })
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${app.server.address().port}`
  const login = email => fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'invalid-test-password' }) })
  try {
    for (let i = 0; i < 30; i++) assert.equal((await login('limited@example.com')).status, 401)
    const blocked = await login('limited@example.com')
    assert.equal(blocked.status, 429)
    assert.ok(Number(blocked.headers.get('retry-after')) > 0)
    assert.equal((await login('another@example.com')).status, 401)
  } finally { await new Promise(resolve => app.server.close(resolve)); await app.db.close() }
})

if (process.env.TEST_DATABASE_URL && ['localhost', '127.0.0.1'].includes(new URL(process.env.TEST_DATABASE_URL).hostname)) {
  test('production PostgreSQL refuses a connection without TLS', async () => {
    await assert.rejects(createApp({ databaseUrl: process.env.TEST_DATABASE_URL, production: true }), /SSL|TLS/)
  })
}

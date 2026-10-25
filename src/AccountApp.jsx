import { useEffect, useState } from 'react'
import CharacterSheet, { Creator } from './App.jsx'
import { createNewSheet, createInitialSheet } from './sheetModel.js'
import { api } from './api.js'
import './AccountApp.css'

function Auth({ onLogin }) {
  const [register, setRegister] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true)
    const data = Object.fromEntries(new FormData(event.currentTarget))
    try { onLogin((await api(register ? '/register' : '/login', { method: 'POST', body: data })).user) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <main className="account-shell auth-shell"><p className="eyebrow">SHINOBI SYSTEM</p><h1>Sua história, encontro por encontro.</h1><p>Guarde seus personagens na sua conta e prepare uma ficha independente para cada sessão.</p><section className="section-card"><h2>{register ? 'Criar conta' : 'Entrar'}</h2><form className="account-form" onSubmit={submit}>{register && <label>Seu nome<input name="name" autoComplete="name" maxLength={80} required /></label>}<label>E-mail<input name="email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="username" maxLength={254} required /></label><label>Senha<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={10} maxLength={128} required /></label>{register && <small>Use uma senha de pelo menos 10 caracteres.</small>}{error && <p role="alert" className="account-error">{error}</p>}<button className="roll-button" disabled={busy}>{busy ? 'Aguarde…' : register ? 'Criar minha conta' : 'Entrar'}</button></form><button className="text-button" disabled={busy} onClick={() => { setRegister(!register); setError('') }}>{register ? 'Já tenho uma conta' : 'Ainda não tenho conta'}</button></section></main>
}

export default function AccountApp() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sheets, setSheets] = useState([])
  const [sheetsOwner, setSheetsOwner] = useState(null)
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [copying, setCopying] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('')
  const [legacy] = useState(() => { try { return Boolean(localStorage.getItem('shinobi-system:yuta-uchiha')) } catch { return false } })
  useEffect(() => {
    let active = true
    api('/me').then(({ user: current }) => { if (active) setUser(current) }).catch(e => { if (active && e.status !== 401) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!user) return
    let active = true
    api('/sheets').then(({ sheets: list }) => { if (active) { setSheets(list); setError('') } }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) { setSheetsOwner(user.id); setLoading(false) } })
    return () => { active = false }
  }, [user])
  async function create(data, campaign = '') {
    setBusy(true); setError('')
    try {
      const { sheet } = await api('/sheets', { method: 'POST', body: { data, campaign } })
      setSheets(current => [sheet, ...current]); setCreating(false); setCopying(null); setSelected(sheet)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function save(data) {
    const { sheet } = await api(`/sheets/${selected.id}`, { method: 'PUT', body: { data, campaign: selected.campaign, revision: selected.revision } })
    setSelected(sheet); setSheets(current => current.map(item => item.id === sheet.id ? sheet : item))
  }
  async function logout() {
    setBusy(true); setError('')
    try { await api('/logout', { method: 'POST' }); setUser(null); setSheetsOwner(null); setSheets([]); setSelected(null) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError('')
    try { await api(`/sheets/${deleting.id}`, { method: 'DELETE' }); setSheets(current => current.filter(s => s.id !== deleting.id)); setDeleting(null) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  if (loading || (user && sheetsOwner !== user.id)) return <main className="account-shell"><p role="status">Carregando suas fichas…</p></main>
  if (!user) return <>{error && <p role="alert" className="account-error">{error}</p>}<Auth onLogin={setUser} /></>
  if (selected) return <CharacterSheet key={selected.id} initialSheet={selected.data} onSave={save} onBack={() => { setSelected(null); setError('') }} />
  if (creating) return <><Creator sheet={createNewSheet()} onFinish={(data, campaign) => create(data, campaign)} onCancel={() => { setCreating(false); setError('') }} busy={busy} error={error} /></>
  const visible = sheets.filter(s => `${s.data.name} ${s.campaign} ${s.data.sessionName ?? ''}`.toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR')))
  return <main className="account-shell"><header className="account-header"><div><p className="eyebrow">SEU REFÚGIO SHINOBI</p><h1>Olá, {user.name}</h1></div><button className="save-button" onClick={logout} disabled={busy}>Sair</button></header><section className="dashboard-intro"><h2>Personagens e encontros</h2><p>Abra uma ficha para jogar ou prepare uma cópia para o próximo encontro. Cada cópia mantém seus próprios recursos e anotações.</p><button className="roll-button" onClick={() => setCreating(true)}>+ Criar personagem</button></section>{legacy && <aside className="section-card"><p>Há uma ficha antiga neste navegador. Você pode importá-la para esta conta; o original será mantido.</p><button className="text-button" disabled={busy} onClick={() => { const data = createInitialSheet(); create({ ...data, sessionName: 'Ficha importada' }) }}>Importar ficha deste navegador</button></aside>}<label className="dashboard-search">Buscar personagem, mesa ou encontro<input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Ex.: Yuta, Konoha, Encontro 2" /></label>{error && <p role="alert" className="account-error">{error}</p>}{!sheets.length && !error && <section className="section-card empty-state"><h2>Sua primeira aventura começa aqui</h2><p>Crie seu personagem com o assistente. Nos próximos encontros, você poderá continuar a partir de uma cópia.</p></section>}{sheets.length > 0 && !visible.length && <p>Nenhuma ficha encontrada.</p>}<div className="sheet-grid">{visible.map(sheet => <article className="section-card sheet-card" key={sheet.id}><p className="eyebrow">{sheet.campaign || 'Aventura livre'}</p><h2>{sheet.data.name}</h2><p className="session-label">{sheet.data.sessionName || 'Primeiro encontro'}</p><p>{sheet.data.clan} · {sheet.data.className} · Nível {sheet.data.level}</p><p>PV {sheet.data.pv.current}/{sheet.data.pv.max} · Chakra {sheet.data.chakra.current}/{sheet.data.chakra.max}</p><small>Salva em {new Date(sheet.updated_at).toLocaleString('pt-BR')}</small><div className="sheet-actions"><button className="roll-button" onClick={() => setSelected(sheet)}>Abrir ficha</button><button className="save-button" onClick={() => setCopying(sheet)}>Preparar próximo encontro</button><button className="text-button" onClick={() => setDeleting(sheet)}>Excluir esta cópia</button></div></article>)}</div>{copying && <div className="account-overlay"><section role="dialog" aria-modal="true" aria-labelledby="copy-title" className="section-card"><h2 id="copy-title">Próximo encontro</h2><p>Uma nova cópia de {copying.data.name} será criada. A ficha anterior permanecerá como está.</p><form className="account-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); create({ ...copying.data, sessionName: data.get('sessionName'), previousSheetId: copying.id }, data.get('campaign')) }}><label>Nome do encontro<input name="sessionName" required maxLength={100} placeholder="Ex.: Encontro 2 — A missão" autoFocus /></label><label>Mesa / campanha<input name="campaign" maxLength={100} defaultValue={copying.campaign} /></label><p className="helper-text">PV, chakra, itens, notas e histórico serão copiados. Ajuste a nova ficha conforme o início da sessão.</p>{error && <p role="alert">{error}</p>}<button className="roll-button" disabled={busy}>{busy ? 'Criando…' : 'Criar cópia do encontro'}</button><button type="button" className="save-button" disabled={busy} onClick={() => setCopying(null)}>Cancelar</button></form></section></div>}{deleting && <div className="account-overlay"><section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="section-card"><h2 id="delete-title">Excluir esta cópia?</h2><p>{deleting.data.name} · {deleting.data.sessionName}. Esta ação não pode ser desfeita. As outras sessões serão mantidas.</p>{error && <p role="alert">{error}</p>}<button className="roll-button" disabled={busy} onClick={remove}>Excluir definitivamente</button><button className="save-button" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button></section></div>}</main>
}

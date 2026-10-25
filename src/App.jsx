import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { normalizeDiceCost } from './dice.js'
import { getVisibleSkills, skillGroups, allSkills, defaultSkills, attributeNames, classSkillSlots, clanSkillSlots, antecedentSkillSlots, calculateSkillValues, clans, antecedents, shinobiClasses, classProgressions, abilityDescriptions, clanAbilityDetails, antecedentAbilityDetails } from './sheetModel.js'

export function Creator({ sheet, onFinish, onCancel, busy, error }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(() => ({ ...sheet, skills: Object.fromEntries(allSkills.map((skill) => [skill, { ...sheet.skills[skill], chosen: false }])) }))
  const [campaign, setCampaign] = useState('')
  const [validation, setValidation] = useState('')
  const headingRef = useRef(null)
  const progressRef = useRef(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
    progressRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [step])
  const titles = ['Identidade', 'Atributos', 'Clã', 'Antecedente', 'Classe Shinobi', 'Perícias', 'Revisão']
  const skillSlots = (classSkillSlots[draft.className] ?? 0) + (clanSkillSlots[draft.clan] ?? 0) + (antecedentSkillSlots[draft.antecedent] ?? 0)
  const selectedSkillsCount = Object.values(draft.skills).filter((skill) => skill?.chosen).length
  const next = () => {
    if (!draft.name.trim() || !draft.sessionName.trim()) { setValidation('Informe o nome do personagem e do encontro.'); setStep(0); return }
    if (!Number.isInteger(Number(draft.level)) || draft.level < 1 || draft.level > 20) { setValidation('O nível deve ser de 1 a 20.'); setStep(0); return }
    if (Object.values(draft.attributes).some(value => !Number.isFinite(value) || value < 0 || value > 100)) { setValidation('Os atributos devem estar entre 0 e 100.'); setStep(1); return }
    if (selectedSkillsCount > skillSlots) { setValidation('Ajuste as perícias ao limite das suas origens.'); setStep(5); return }
    setValidation('')
    if (step < 6) setStep(step + 1)
    else onFinish(draft, campaign)
  }
  function updateDraftSkill(skill, key, value) {
    setDraft((current) => ({ ...current, skills: { ...current.skills, [skill]: { ...(current.skills[skill] ?? defaultSkills[skill]), [key]: value } } }))
  }
  function toggleDraftSkill(skill, checked) {
    if (checked && selectedSkillsCount >= skillSlots) return
    updateDraftSkill(skill, 'chosen', checked)
  }
  return <main className="character-sheet creator-screen">
    <p className="eyebrow">Criador de personagem</p><h1 ref={headingRef} tabIndex={-1}>{titles[step]}</h1><p className="creator-step-label" aria-live="polite">Etapa {step + 1} de {titles.length}</p>
    <div className="creator-progress" ref={progressRef}>{titles.map((title, index) => <button type="button" aria-label={title} aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)} disabled={busy} key={title}>{index + 1}</button>)}</div>
    {(validation || error) && <p role="alert" className="account-error">{validation || error}</p>}
    <section className="section-card creator-card">
      {step === 0 && <div className="account-form"><label>Nome do personagem<input value={draft.name} maxLength={100} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label><label>Mesa / campanha (opcional)<input value={campaign} maxLength={100} onChange={event => setCampaign(event.target.value)} /></label><label>Nome do encontro<input value={draft.sessionName} maxLength={100} onChange={event => setDraft({ ...draft, sessionName: event.target.value })} /></label><label>Nível<input type="number" min="1" max="20" value={draft.level} onChange={event => setDraft({ ...draft, level: Number(event.target.value) })} /></label><p className="helper-text">Comece uma ficha própria. As regras e habilidades ficam disponíveis conforme suas escolhas.</p></div>}

      {step === 1 && <><p className="helper-text">Distribua e ajuste os atributos. Os valores continuam editáveis na ficha.</p><div className="editor-grid">{Object.entries(attributeNames).map(([key, label]) => <label key={key}>{key} — {label}<input type="number" value={draft.attributes[key]} onChange={(event) => setDraft({ ...draft, attributes: { ...draft.attributes, [key]: Number(event.target.value) } })} /></label>)}</div></>}
      {step === 2 && <><p className="helper-text">O clã define o tema e os benefícios que serão exibidos na ficha.</p><div className="choice-grid">{clans.map((clan) => <button type="button" className={draft.clan === clan ? 'selected' : ''} onClick={() => setDraft({ ...draft, clan })} key={clan}>{clan}</button>)}</div></>}
      {step === 3 && <><p className="helper-text">Escolha o antecedente do personagem.</p><div className="choice-grid">{antecedents.map((antecedent) => <button type="button" className={draft.antecedent === antecedent ? 'selected' : ''} onClick={() => setDraft({ ...draft, antecedent })} key={antecedent}>{antecedent}</button>)}</div></>}
      {step === 4 && <><p className="helper-text">A classe shinobi define as habilidades automáticas exibidas por nível.</p><div className="choice-grid class-choices">{shinobiClasses.map((className) => <button type="button" className={draft.className === className ? 'selected' : ''} onClick={() => setDraft({ ...draft, className, path: className })} key={className}>{className}</button>)}</div></>}
      {step === 5 && <><p className="helper-text">Escolha até {skillSlots} perícias para receberem a base 50% + a dezena do atributo.</p><div className="skill-slot-summary"><strong>{selectedSkillsCount} / {skillSlots}</strong><span>{classSkillSlots[draft.className] ?? 0} da classe · {clanSkillSlots[draft.clan] ?? 0} do clã · {antecedentSkillSlots[draft.antecedent] ?? 0} do antecedente</span></div><div className="creator-skill-list">{skillGroups.flatMap((group) => group.skills).map(([skill, fallbackAttribute]) => { const definition = draft.skills[skill] ?? { ...defaultSkills[skill], attribute: fallbackAttribute }; const values = calculateSkillValues(draft.attributes, definition); return <label className="creator-skill-row" key={skill}><input aria-label={`Treinar ${skill}`} type="checkbox" checked={Boolean(definition.chosen)} disabled={!definition.chosen && selectedSkillsCount >= skillSlots} onChange={(event) => toggleDraftSkill(skill, event.target.checked)} /><span><b>{skill}</b><small>N {values.normal} · B {values.good} · E {values.extreme}</small></span><select value={definition.attribute} onChange={(event) => updateDraftSkill(skill, 'attribute', event.target.value)}>{Object.entries(attributeNames).map(([key, name]) => <option value={key} key={key}>{key} · {name}</option>)}</select></label> })}</div></>}
      {step === 6 && <div className="creator-review"><h2>{draft.name || 'Seu personagem'}</h2><p>{campaign || 'Aventura livre'} · {draft.sessionName}</p><p>{draft.clan} · {draft.antecedent} · {draft.className} · Nível {draft.level}</p><p>{selectedSkillsCount} de {skillSlots} perícias escolhidas.</p><p className="helper-text">Defina PV e chakra de acordo com as regras da sua mesa. Você poderá ajustar os valores depois.</p><div className="editor-grid">{['pv', 'chakra'].map(key => <label key={key}>{key === 'pv' ? 'PV' : 'Chakra'} inicial e máximo<input type="number" min="1" max="99999" value={draft[key].max} onChange={event => { const value = Math.max(1, Math.min(99999, Number(event.target.value))); setDraft({ ...draft, [key]: { current: value, max: value } }) }} /></label>)}</div></div>}
    </section>
    <div className="creator-actions"><button type="button" disabled={busy} onClick={() => step ? setStep(step - 1) : onCancel()}>{step ? 'Voltar' : 'Cancelar'}</button><button type="button" disabled={busy} className="roll-button" onClick={next}>{busy ? 'Salvando…' : step === 6 ? 'Criar ficha' : 'Continuar'}</button></div>
  </main>
}

function ResourceCard({ label, resource, tone, onChange }) {
  return (
    <div className={`resource-card ${tone}`}>
      <div className="resource-label"><span>{label}</span><strong>{resource.current} <small>/ {resource.max}</small></strong></div>
      <progress value={resource.current} max={resource.max || 1} aria-label={`${label}: ${resource.current} de ${resource.max}`} />
      <div className="resource-controls">
        <button type="button" onClick={() => onChange(-1)} aria-label={`Diminuir ${label}`}>−</button>
        <button type="button" onClick={() => onChange(1)} aria-label={`Aumentar ${label}`}>+</button>
      </div>
    </div>
  )
}

function App({ initialSheet, onSave, onBack }) {
  const [sheet, setSheet] = useState(initialSheet)
  const [savedSheet, setSavedSheet] = useState(JSON.stringify(initialSheet))
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(sheet) !== savedSheet
  const [activeTab, setActiveTab] = useState('ficha')
  const [skillTraining, setSkillTraining] = useState('all')
  const [skillOrder, setSkillOrder] = useState('value-desc')
  const [jutsuError, setJutsuError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('shinobi-system:theme') ?? 'dark')
  const [selectedAbility, setSelectedAbility] = useState(null)
  const [selectedSkill, setSelectedSkill] = useState('Taijutsu')
  const [draftJutsu, setDraftJutsu] = useState({ name: '', rank: '', chakra: '', description: '' })
  const [draftAbility, setDraftAbility] = useState({ name: '', source: 'Personalizada', level: '', description: '' })
  const [saveMessage, setSaveMessage] = useState('')

  const visibleSkills = getVisibleSkills(sheet, skillTraining, skillOrder)
  const selectedLimits = calculateSkillValues(sheet.attributes, sheet.skills[selectedSkill] ?? defaultSkills[selectedSkill])
  const currentLevel = Math.max(1, Math.min(20, Number(sheet.level) || 1))
  const classAbilities = Object.entries(classProgressions[sheet.className] ?? {}).filter(([level]) => Number(level) <= currentLevel).flatMap(([level, abilities]) => abilities.map((ability) => ({ level, ability })))
  const sneakAttackDice = `${Math.ceil(currentLevel / 2)}d6`
  const maneuverDice = currentLevel >= 20 ? 5 : currentLevel >= 15 ? 4 : currentLevel >= 10 ? 3 : currentLevel >= 5 ? 2 : 1
  const unarmoredMovement = currentLevel >= 18 ? '+9 m' : currentLevel >= 14 ? '+7,5 m' : currentLevel >= 10 ? '+6 m' : currentLevel >= 6 ? '+4,5 m' : currentLevel >= 2 ? '+3 m' : '—'

  useEffect(() => {
    if (!dirty) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('shinobi-system:theme', theme)
  }, [theme])

  const rollSummary = useMemo(() => sheet.rollHistory[0], [sheet.rollHistory])

  function updateSheet(updater) { setSheet((current) => updater(current)) }
  async function saveNow() {
    const previous = JSON.parse(savedSheet)
    const invalid = sheet.jutsus.find(jutsu => !normalizeDiceCost(jutsu.chakra) && !previous.jutsus.some(old => old.id === jutsu.id && old.chakra === jutsu.chakra))
    if (invalid) { setSaveMessage(`Informe o custo de ${invalid.name} em dados, como 1d8 ou 2d6+2.`); return }
    setSaving(true); setSaveMessage('')
    const snapshot = JSON.stringify({ ...sheet, jutsus: sheet.jutsus.map(jutsu => ({ ...jutsu, chakra: normalizeDiceCost(jutsu.chakra) ?? jutsu.chakra })) })
    try { await onSave(JSON.parse(snapshot)); setSavedSheet(JSON.stringify(sheet)); setSaveMessage('Ficha salva na sua conta.') }
    catch (error) { setSaveMessage(error.message) } finally { setSaving(false) }
  }
  function back() {
    if (!dirty || window.confirm('Há alterações não salvas. Voltar e descartá-las?')) onBack()
  }
  function updateText(event) { const { name, value } = event.target; updateSheet((current) => ({ ...current, [name]: value })) }
  function updateNumber(group, key, value) { updateSheet((current) => ({ ...current, [group]: { ...current[group], [key]: Number(value) } })) }
  function changeResource(resource, amount) { updateSheet((current) => ({ ...current, [resource]: { ...current[resource], current: Math.max(0, current[resource].current + amount) } })) }
  function updateAttribute(key, value) { updateSheet((current) => ({ ...current, attributes: { ...current.attributes, [key]: Number(value) } })) }
  function updateSkill(skill, key, value) {
    updateSheet((current) => ({ ...current, skills: { ...current.skills, [skill]: { ...(current.skills[skill] ?? defaultSkills[skill]), [key]: value } } }))
  }
  function updateSkillValue(skill, key, value) {
    updateSheet((current) => ({ ...current, skills: { ...current.skills, [skill]: { ...(current.skills[skill] ?? defaultSkills[skill]), manualValues: { ...(current.skills[skill]?.manualValues ?? {}), [key]: Math.max(0, Number(value)) } } } }))
  }
  function restoreAutomaticSkillValues(skill) {
    updateSheet((current) => {
      const { manualValues: _manualValues, ...definition } = current.skills[skill] ?? defaultSkills[skill]
      return { ...current, skills: { ...current.skills, [skill]: definition } }
    })
  }
  function updatePortrait(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 1_500_000) { setSaveMessage('Use uma imagem de até 1,5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => updateSheet((current) => ({ ...current, portrait: reader.result }))
    reader.readAsDataURL(file)
  }

  function getAbilityDescription(ability) {
    const baseName = ability.replace(/ \(.+\)/, '')
    if (baseName === 'Ataque Furtivo') return `Uma vez por turno, ao acertar uma criatura com vantagem na jogada de ataque, acrescenta ${sneakAttackDice} ao dano. O dado sobe nos níveis ímpares e se mantém no nível par seguinte.`
    if (baseName === 'Manobra') return `Você possui ${maneuverDice} dado${maneuverDice > 1 ? 's' : ''} de manobra d8. Cada uso gasta um dado. As manobras conhecidas são Ataque de Precisão, Passo Evasivo e Ataque Desarme; a regra ainda não informa quando a reserva é recuperada.`
    if (baseName === 'Movimento sem Armadura') return `Enquanto não usa armadura nem escudo, seu bônus atual é ${unarmoredMovement}. Os aumentos de +3 m próprios da progressão do Assassino aparecem separadamente e a cumulatividade precisa da confirmação do mestre.`
    return abilityDescriptions[baseName] ?? 'A descrição detalhada desta progressão será adicionada a partir das regras da habilidade.'
  }

  function rollD100() {
    const value = Math.floor(Math.random() * 100) + 1
    const limits = selectedLimits
    const quality = value <= limits.extreme ? 'Extremo' : value <= limits.good ? 'Bom' : value <= limits.normal ? 'Normal' : 'Falha'
    const roll = { id: Date.now(), skill: selectedSkill, value, quality, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
    updateSheet((current) => ({ ...current, rollHistory: [roll, ...current.rollHistory].slice(0, 20) }))
  }

  function addJutsu(event) {
    event.preventDefault()
    if (!draftJutsu.name.trim()) return
    const chakra = normalizeDiceCost(draftJutsu.chakra)
    if (!chakra) { setJutsuError('Informe o custo em dados, como 1d8 ou 2d6+2. Um valor fixo, como 8, não é válido.'); return }
    setJutsuError('')
    const jutsu = { ...draftJutsu, name: draftJutsu.name.trim(), chakra, id: crypto.randomUUID() }
    updateSheet((current) => ({ ...current, jutsus: [...current.jutsus, jutsu] }))
    setDraftJutsu({ name: '', rank: '', chakra: '', description: '' })
  }

  function updateJutsuCost(id, chakra) { updateSheet(current => ({ ...current, jutsus: current.jutsus.map(jutsu => jutsu.id === id ? { ...jutsu, chakra } : jutsu) })) }

  function removeJutsu(id) { updateSheet((current) => ({ ...current, jutsus: current.jutsus.filter((jutsu) => jutsu.id !== id) })) }
  function addCustomAbility(event) {
    event.preventDefault()
    if (!draftAbility.name.trim()) return
    updateSheet((current) => ({ ...current, customAbilities: [...(current.customAbilities ?? []), { ...draftAbility, id: Date.now() }] }))
    setDraftAbility({ name: '', source: 'Personalizada', level: '', description: '' })
  }
  function removeCustomAbility(id) { updateSheet((current) => ({ ...current, customAbilities: (current.customAbilities ?? []).filter((ability) => ability.id !== id) })) }

  return (
    <main className="character-sheet">
      <div className="sheet-toolbar"><button className="save-button" disabled={saving} onClick={back}>← Minhas fichas</button><button className="save-button" disabled={saving || !dirty} onClick={saveNow}>{saving ? 'Salvando…' : 'Salvar ficha'}</button><span role="status">{dirty ? 'Alterações não salvas' : 'Ficha salva'}</span><p>{sheet.sessionName || 'Encontro'}</p>{saveMessage && <p role="status">{saveMessage}</p>}</div>
      <div className="theme-background" aria-hidden="true" />
      <header className="character-header" style={sheet.portrait ? { '--character-portrait': `url(${sheet.portrait})` } : undefined}>
        <div className="header-topline"><p className="eyebrow">Ficha shinobi</p><span><button className="save-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀ Claro' : '☾ Escuro'}</button> <button className="save-button edit-button" type="button" onClick={() => setIsEditing((current) => !current)}>{isEditing ? 'Concluir' : 'Editar'}</button></span></div>
        <div className="profile-title"><label className={`portrait-picker ${isEditing ? 'editing' : ''}`} title={isEditing ? 'Alterar foto' : 'Foto do personagem'}><input type="file" accept="image/*" onChange={updatePortrait} />{sheet.portrait ? <img src={sheet.portrait} alt={`Retrato de ${sheet.name}`} /> : <span>忍</span>}</label>{isEditing ? <input className="character-name-input" name="name" value={sheet.name} onChange={updateText} aria-label="Nome do personagem" /> : <h1>{sheet.name}</h1>}</div>
        <div className="character-meta">
          <p><span>Clã</span>{isEditing ? <input name="clan" value={sheet.clan} onChange={updateText} /> : sheet.clan}</p>
          <p><span>Nível</span>{isEditing ? <input type="number" name="level" min="1" value={sheet.level} onChange={updateText} /> : sheet.level}</p>
          <p><span>Caminho</span>{isEditing ? <input name="path" value={sheet.path} onChange={updateText} /> : sheet.path}</p>
          <p><span>Deslocamento</span>{isEditing ? <input name="movement" value={sheet.movement} onChange={updateText} /> : sheet.movement}</p>
        </div>
        <div className="header-resources"><ResourceCard label="PV" resource={sheet.pv} tone="pv" onChange={(amount) => changeResource('pv', amount)} /><ResourceCard label="Chakra" resource={sheet.chakra} tone="chakra" onChange={(amount) => changeResource('chakra', amount)} /></div>
        {isEditing && <div className="resource-max-editor"><label>PV máximo<input type="number" min="1" value={sheet.pv.max} onChange={(event) => updateNumber('pv', 'max', event.target.value)} /></label><label>Chakra máximo<input type="number" min="1" value={sheet.chakra.max} onChange={(event) => updateNumber('chakra', 'max', event.target.value)} /></label></div>}
        <p className="demo-notice">Edite os valores e clique em Salvar ficha para guardar as alterações deste encontro na sua conta.</p>

      </header>

      {activeTab === 'ficha' && <>
        <section className="section-card identity-card"><div className="section-heading"><p className="section-kicker">IDENTIDADE SHINOBI</p><h2>Informações</h2></div><div className="identity-grid"><article><span>Antecedente</span>{isEditing ? <input name="antecedent" value={sheet.antecedent ?? ''} onChange={updateText} /> : <strong>{sheet.antecedent || '—'}</strong>}</article><article><span>Ryō</span>{isEditing ? <input type="number" min="0" name="ryo" value={sheet.ryo ?? 0} onChange={updateText} /> : <strong>{sheet.ryo ?? 0}</strong>}</article><article className="identity-wide"><span>Afinidades</span>{isEditing ? <input name="affinity" value={sheet.affinity ?? ''} onChange={updateText} /> : <strong>{sheet.affinity || '—'}</strong>}</article><article className="identity-wide"><span>Proficiências</span>{isEditing ? <textarea name="proficiencies" value={sheet.proficiencies ?? ''} onChange={updateText} /> : <strong>{sheet.proficiencies || '—'}</strong>}</article></div></section>
        <section className="section-card"><div className="section-heading"><p className="section-kicker">BASE</p><h2>Atributos</h2></div><div className="attribute-grid">{Object.entries(sheet.attributes).sort(([, a], [, b]) => b - a).map(([key, value]) => <article className="attribute-card" key={key}><span title={attributeNames[key]}>{key}</span>{isEditing ? <input type="number" min="0" value={value} onChange={(event) => updateAttribute(key, event.target.value)} aria-label={attributeNames[key]} /> : <strong>{value}</strong>}</article>)}</div></section>
        <section className="section-card"><div className="section-heading"><p className="section-kicker">NOTAS</p><h2>Anotações</h2></div><textarea className="notes-field" value={sheet.notes} onChange={(event) => updateSheet((current) => ({ ...current, notes: event.target.value }))} placeholder="Escreva anotações da campanha..." /></section>
      </>}

      {activeTab === 'pericias' && <section className="section-card tab-content">
        <div className="section-heading"><p className="section-kicker">D100</p><h2>Perícias</h2><p className="helper-text">Treinadas: {Object.values(sheet.skills).filter(skill => skill?.chosen).length}. Normal: 50 + dezena do atributo para treinadas; 10 + dezena para as demais.</p></div>
        <div className="skill-filters">
          <label>Treinamento<select aria-label="Treinamento" value={skillTraining} onChange={event => setSkillTraining(event.target.value)}><option value="all">Todas as perícias</option><option value="trained">Somente treinadas</option><option value="untrained">Não treinadas</option></select></label>
          <label>Ordenação<select aria-label="Ordenação" value={skillOrder} onChange={event => setSkillOrder(event.target.value)}><option value="value-desc">Maior valor primeiro</option><option value="alphabetical">Ordem alfabética</option></select></label>
        </div>
        <p className="helper-text" role="status">{visibleSkills.length} perícia{visibleSkills.length === 1 ? '' : 's'} exibida{visibleSkills.length === 1 ? '' : 's'}.</p>
        <div className="skill-list skill-table">{visibleSkills.map(({ name: skill, group, definition, values }) => <div className={`skill-row ${isEditing ? 'skill-row-editing' : ''}`} key={skill}>
          <div><strong>{skill}</strong><span>{definition.attribute} · {group}{definition.chosen ? ' · Treinada' : ''}</span></div>
          {isEditing ? <><label className="skill-check"><input aria-label={`Treinada em ${skill}`} type="checkbox" checked={Boolean(definition.chosen)} onChange={event => updateSkill(skill, 'chosen', event.target.checked)} /> treinada</label><select aria-label={`Atributo de ${skill}`} value={definition.attribute} onChange={event => updateSkill(skill, 'attribute', event.target.value)}>{Object.entries(attributeNames).map(([key, name]) => <option value={key} key={key}>{key} · {name}</option>)}</select><div className="skill-edit-fields"><label>N<input aria-label={`${skill} normal`} type="number" min="0" value={values.normal} onChange={event => updateSkillValue(skill, 'normal', event.target.value)} /></label><label>B<input aria-label={`${skill} bom`} type="number" min="0" value={values.good} onChange={event => updateSkillValue(skill, 'good', event.target.value)} /></label><label>E<input aria-label={`${skill} extremo`} type="number" min="0" value={values.extreme} onChange={event => updateSkillValue(skill, 'extreme', event.target.value)} /></label><button type="button" onClick={() => restoreAutomaticSkillValues(skill)}>Auto</button></div></> : <div className="skill-values"><b>N {values.normal}</b><b>B {values.good}</b><b>E {values.extreme}</b></div>}
        </div>)}</div>
        {!visibleSkills.length && <p className="empty-state">Nenhuma perícia neste filtro. Selecione Todas as perícias para alterar o treinamento.</p>}
      </section>}

      {activeTab === 'habilidades' && <section className="section-card tab-content"><div className="section-heading"><p className="section-kicker">CLASSE SHINOBI</p><h2>{sheet.className || 'Classe não definida'}</h2><p className="helper-text">Nível atual: {currentLevel}. Toque em uma habilidade para ler o efeito.</p></div>{sheet.className === 'Assassino' && <div className="ability-status"><article><span>Ataque Furtivo</span><strong>{sneakAttackDice}</strong></article><article><span>Manobras</span><strong>{maneuverDice}d8</strong></article><article><span>Sem armadura</span><strong>{unarmoredMovement}</strong></article></div>}<div className="ability-list">{classAbilities.length ? classAbilities.map(({ level, ability }, index) => <div key={`${level}-${ability}-${index}`}><button className="ability-row" type="button" onClick={() => setSelectedAbility(selectedAbility?.ability === ability && selectedAbility?.level === level ? null : { level, ability })}><span>Nível {level}</span><strong>{ability}</strong><b>{selectedAbility?.ability === ability && selectedAbility?.level === level ? '−' : '+'}</b></button>{selectedAbility?.ability === ability && selectedAbility?.level === level && <div className="ability-description">{getAbilityDescription(ability)}</div>}</div>) : <p className="empty-state">Defina uma classe e um nível numérico para listar as habilidades.</p>}</div><div className="section-heading progression-heading"><p className="section-kicker">EVOLUÇÃO COMPLETA</p><h2>Próximos níveis</h2></div><div className="level-progression">{Array.from({ length: 20 }, (_, index) => index + 1).map((level) => <article className={level <= currentLevel ? 'unlocked' : ''} key={level}><strong>Nível {level}</strong><div>{(classProgressions[sheet.className]?.[level] ?? ['Sem mudança registrada']).map((ability) => <span key={ability}>{ability}</span>)}</div></article>)}</div></section>}

      {activeTab === 'habilidades' && <section className="section-card origin-abilities"><div className="section-heading"><p className="section-kicker">ORIGENS E TÉCNICAS</p><h2>Outras habilidades</h2></div><div className="origin-list">{[...(clanAbilityDetails[sheet.clan] ?? []), ...(antecedentAbilityDetails[sheet.antecedent] ?? [])].map((ability) => <article key={ability.name}><span>{ability.name}</span><p>{ability.description}</p></article>)}{!(clanAbilityDetails[sheet.clan]?.length || antecedentAbilityDetails[sheet.antecedent]?.length) && <p className="empty-state">Ainda não há habilidade automática cadastrada para este clã ou antecedente.</p>}</div>{(sheet.customAbilities ?? []).map((ability) => <article className="custom-ability" key={ability.id}><div><p className="section-kicker">{ability.source}{ability.level && ` · Nível ${ability.level}`}</p><h3>{ability.name}</h3><p>{ability.description || 'Sem descrição cadastrada.'}</p></div>{isEditing && <button type="button" onClick={() => removeCustomAbility(ability.id)} aria-label={`Remover ${ability.name}`}>×</button>}</article>)}{isEditing && <form className="custom-ability-form" onSubmit={addCustomAbility}><h3>Adicionar habilidade</h3><input placeholder="Nome da habilidade" value={draftAbility.name} onChange={(event) => setDraftAbility({ ...draftAbility, name: event.target.value })} /><div><input placeholder="Origem (clã, item, etc.)" value={draftAbility.source} onChange={(event) => setDraftAbility({ ...draftAbility, source: event.target.value })} /><input type="number" min="1" placeholder="Nível" value={draftAbility.level} onChange={(event) => setDraftAbility({ ...draftAbility, level: event.target.value })} /></div><textarea placeholder="Descrição e efeitos" value={draftAbility.description} onChange={(event) => setDraftAbility({ ...draftAbility, description: event.target.value })} /><button className="roll-button" type="submit">Adicionar habilidade</button></form>}</section>}

      {activeTab === 'rolagens' && <section className="roll-panel tab-content"><div><p className="section-kicker">TESTE</p><h2>Rolagem D100</h2><label className="roll-label" htmlFor="skill-select">Perícia</label><select id="skill-select" value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}>{allSkills.map((skill) => <option key={skill}>{skill}</option>)}</select><p>Normal {selectedLimits.normal} · Bom {selectedLimits.good} · Extremo {selectedLimits.extreme}.</p></div><button type="button" className="roll-button" onClick={rollD100}>Rolar D100</button><p className="roll-result" aria-live="polite">{rollSummary ? `${rollSummary.skill}: ${rollSummary.value} — ${rollSummary.quality}` : 'Nenhuma rolagem realizada.'}</p><div className="history"><h3>Histórico</h3>{sheet.rollHistory.length ? sheet.rollHistory.map((roll) => <div className="history-row" key={roll.id}><span>{roll.skill} · {roll.time}</span><strong>{roll.value} — {roll.quality}</strong></div>) : <p>Nenhuma rolagem salva.</p>}</div></section>}

      {activeTab === 'jutsus' && <section className="section-card tab-content">
        <div className="section-heading"><p className="section-kicker">BIBLIOTECA PESSOAL</p><h2>Jutsus</h2><p className="helper-text">Cadastre técnicas próprias. O custo de chakra é salvo em dados, sem transformar a expressão em um valor fixo.</p></div>
        <form className="jutsu-form" onSubmit={addJutsu}>
          <input aria-label="Nome do jutsu" placeholder="Nome do jutsu" required value={draftJutsu.name} onChange={event => setDraftJutsu({ ...draftJutsu, name: event.target.value })} />
          <input aria-label="Rank do jutsu" placeholder="Rank" value={draftJutsu.rank} onChange={event => setDraftJutsu({ ...draftJutsu, rank: event.target.value })} />
          <label className="jutsu-cost-field">Custo de chakra em dados<input type="text" placeholder="Ex.: 1d8 ou 2d6+2" maxLength={60} required aria-describedby="jutsu-cost-help" aria-invalid={Boolean(jutsuError)} value={draftJutsu.chakra} onChange={event => { setDraftJutsu({ ...draftJutsu, chakra: event.target.value }); setJutsuError('') }} /></label>
          <p id="jutsu-cost-help" className="helper-text">Use quantidade e faces do dado: 1d8, 2d6 ou 1d8+2.</p>
          {jutsuError && <p role="alert" className="account-error">{jutsuError}</p>}
          <textarea aria-label="Descrição do jutsu" placeholder="Descrição" value={draftJutsu.description} onChange={event => setDraftJutsu({ ...draftJutsu, description: event.target.value })} />
          <button className="roll-button" type="submit">Adicionar jutsu</button>
        </form>
        <div className="jutsu-list">{sheet.jutsus.map(jutsu => <article className="jutsu-entry" key={jutsu.id}><div><h3>{jutsu.name}</h3>
          <p>{jutsu.rank && `Rank ${jutsu.rank}`}{normalizeDiceCost(jutsu.chakra) && ` · ${normalizeDiceCost(jutsu.chakra)} Chakra`}</p>
          {!normalizeDiceCost(jutsu.chakra) && <p className="helper-text">Custo antigo: {jutsu.chakra === '' || jutsu.chakra == null ? 'não informado' : jutsu.chakra}. Edite a ficha para informar os dados.</p>}
          {isEditing && <label className="jutsu-cost-field">Custo de {jutsu.name} em dados<input type="text" maxLength={60} placeholder="Ex.: 1d8" value={jutsu.chakra ?? ''} onChange={event => updateJutsuCost(jutsu.id, event.target.value)} onBlur={event => { const cost = normalizeDiceCost(event.target.value); if (cost) updateJutsuCost(jutsu.id, cost) }} /></label>}
          <p>{jutsu.description}</p></div><button type="button" onClick={() => removeJutsu(jutsu.id)} aria-label={`Remover ${jutsu.name}`}>×</button></article>)}{!sheet.jutsus.length && <p className="empty-state">Nenhum jutsu particular cadastrado.</p>}</div>
      </section>}

      <nav className="bottom-nav" aria-label="Navegação principal">{[['ficha', '◈', 'Ficha'], ['pericias', '⌁', 'Perícias'], ['habilidades', '✦', 'Habilidades'], ['rolagens', '◎', 'Rolagens'], ['jutsus', '忍', 'Jutsus']].map(([tab, icon, label]) => <button className={`nav-item ${activeTab === tab ? 'active' : ''}`} type="button" key={tab} onClick={() => setActiveTab(tab)}><span>{icon}</span>{label}</button>)}</nav>
    </main>
  )
}

export default App

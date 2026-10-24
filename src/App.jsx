import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'shinobi-system:yuta-uchiha'

const skillGroups = [
  { title: 'Combativas', skills: [['Taijutsu', 'DEX'], ['Jutsu', 'ART'], ['Esquiva', 'DEX'], ['Contra-ataque', 'DEX'], ['Bloqueio', 'CON'], ['Imobilizar', 'FOR'], ['Atletismo', 'DEX'], ['Acrobacia', 'FOR'], ['Arremesso', 'DEX']] },
  { title: 'Inteligência', skills: [['Genjutsu', 'ART'], ['Fūinjutsu', 'ART'], ['Intuição', 'INT'], ['Investigação', 'INT'], ['Furtividade', 'INT'], ['História', 'INT'], ['Encontrar', 'INT'], ['Sobrevivência', 'INT'], ['Natureza', 'INT'], ['Medicina', 'INT'], ['Ninjutsu', 'ART'], ['Roubo', 'DEX'], ['Farmacologia', 'INT'], ['Aprendizagem', 'INT'], ['Escutar', 'INT']] },
  { title: 'Sociais', skills: [['Atuação', 'CAR'], ['Enganação', 'CAR'], ['Intimidação', 'CAR'], ['Lábia', 'CAR'], ['Acalmar', 'CAR'], ['Adestrar Animais', 'CAR'], ['Sorte', 'CAR'], ['Vontade', 'CAR']] },
]

const allSkills = skillGroups.flatMap((group) => group.skills.map(([name]) => name))
const chosenYutaSkills = ['Jutsu', 'Genjutsu', 'Taijutsu', 'Esquiva', 'Atletismo', 'Arremesso', 'Intuição', 'Investigação', 'Furtividade', 'História', 'Ninjutsu', 'Roubo', 'Aprendizagem', 'Escutar', 'Acalmar', 'Vontade', 'Acrobacia']
const defaultSkills = Object.fromEntries(skillGroups.flatMap((group) => group.skills).map(([name, attribute]) => [name, { attribute, chosen: chosenYutaSkills.includes(name), extremeBonus: name === 'Genjutsu' ? 5 : 0 }]))

const defaultSheet = {
  sheetVersion: 3,
  name: 'Yuta Uchiha', clan: 'Uchiha', level: 1, path: 'Assassino', className: 'Assassino', antecedent: 'Shinobi',
  pv: { current: 21, max: 21 }, chakra: { current: 41, max: 41 }, movement: '24 m', ryo: 1000, affinity: 'Katon, Fuuton',
  proficiencies: 'Armaduras leves, armas ninjas e uma arma extra à escolha',
  attributes: { FOR: 20, DEX: 50, CON: 30, INT: 38, ART: 40, CAR: 15 },
  skills: defaultSkills, notes: '', portrait: '', jutsus: [], customAbilities: [], rollHistory: [],
}

const attributeNames = { FOR: 'Força', DEX: 'Destreza', CON: 'Constituição', INT: 'Inteligência', ART: 'Arte Ninja', CAR: 'Carisma' }
const classSkillSlots = { 'Linha de Frente': 9, Assassino: 12, Suporte: 15 }
const clanSkillSlots = { Hoshigaki: 1, Sarutobi: 1, Uchiha: 1, Uzumaki: 1 }
const antecedentSkillSlots = { Amnésico: 3, ANBU: 2, Cientista: 2, Criminoso: 2, Espião: 2, Fazendeiro: 2, Herói: 2, Kage: 2, 'Médico Shinobi': 3, Mercador: 2, Nobre: 2, Renegado: 2, Samurai: 3, Shinobi: 3 }
function calculateSkillValues(attributes, skill) {
  const tens = Math.floor((Number(attributes[skill.attribute]) || 0) / 10)
  const normal = (skill.chosen ? 50 : 10) + tens + (skill.normalBonus ?? 0)
  const automaticValues = { normal, good: Math.floor(normal / 2), extreme: Math.floor(normal / 10) + (skill.extremeBonus ?? 0) }
  return { ...automaticValues, ...(skill.manualValues ?? {}) }
}
const clans = ['Akimichi', 'Aburame', 'Hoshigaki', 'Hyuuga', 'Inuzuka', 'Kaguya', 'Kazekage', 'Kurama', 'Nara', 'Raikage', 'Sarutobi', 'Senju', 'Uchiha', 'Uzumaki', 'Yamanaka']
const antecedents = ['Amnésico', 'ANBU', 'Cientista', 'Criminoso', 'Espião', 'Fazendeiro', 'Herói', 'Kage', 'Médico Shinobi', 'Mercador', 'Nobre', 'Renegado', 'Samurai', 'Shinobi']
const shinobiClasses = ['Linha de Frente', 'Assassino', 'Suporte']
const assassinProgression = {
  1: ['Ataque Furtivo (1d6)', 'Manobra (1/5)'], 2: ['Movimento sem Armadura (+3 m)'], 3: ['Ataque Furtivo (2d6)', 'Ação Ardilosa'], 4: ['Máscara da Natureza'],
  5: ['Ataque Furtivo (3d6)', 'Ataque Extra', 'Ação Lendária (1/2)', 'Manobra (2/5)', '+3 m (1/4)'], 6: ['Ataque Furtivo (3d6)'],
  7: ['Ataque Furtivo (4d6)', 'Especialização (1/2)'], 8: ['Ataque Furtivo (4d6)', 'Sortudo (1/2)'], 9: ['Ataque Furtivo (5d6)', 'Crítico Aprimorado'],
  10: ['Ataque Furtivo (5d6)', 'Evasão', 'Manobra (3/5)', '+3 m (2/4)'], 11: ['Ataque Furtivo (6d6)', 'Olhar Ameaçador (1/2)'], 12: ['Ataque Furtivo (6d6)'],
  13: ['Ataque Furtivo (7d6)', 'Sortudo (2/2)'], 14: ['Ataque Furtivo (7d6)', 'Especialização (2/2)'], 15: ['Ataque Furtivo (8d6)', 'Ação Lendária (2/2)', 'Manobra (4/5)', '+3 m (3/4)'],
  16: ['Ataque Furtivo (8d6)'], 17: ['Ataque Furtivo (9d6)', 'Sentido Cego'], 18: ['Ataque Furtivo (9d6)', 'Mente Tranquila'], 19: ['Ataque Furtivo (10d6)'],
  20: ['Ataque Furtivo (10d6)', 'Olhar Ameaçador (2/2)', 'Manobra (5/5)', '+3 m (4/4)'],
}
const classProgressions = {
  'Linha de Frente': { 1: ['Retomar o Fôlego', 'Ponto de Estamina'], 2: ['Surto de Ação'], 3: ['Sentido de Perigo'], 5: ['Ação Lendária', 'Ataque Extra', '+3m de movimentação'], 8: ['Inspiração Grupal'], 9: ['Indomável'], 10: ['Resistência Primordial'], 11: ['Olhar Ameaçador'], 12: ['Ataque Extra (2/2)'], 15: ['Ação Lendária (2/2)'], 17: ['Surto de Ação (2/2)'], 18: ['Crítico Instantâneo'], 19: ['Elusivo'] },
  Assassino: assassinProgression,
  Suporte: { 1: ['Aptidão Ninja', 'Aptidão'], 2: ['Sentido de Perigo'], 3: ['Defletir Projéteis'], 4: ['Conversão'], 5: ['Versatilidade', 'Ação Lendária'], 6: ['Conheça seu Inimigo'], 7: ['Evasão'], 8: ['Aptidão (2/2)', 'Conversão (2/5)'], 9: ['Indomável'], 10: ['Potencialização'], 11: ['Olhar Ameaçador'], 12: ['Transferência de Turno'], 13: ['Astúcia'], 14: ['Ataque Extra'], 15: ['Ação Lendária (2/2)'], 16: ['Implacável'], 17: ['Sentido Cego'], 18: ['Tática Ninja'] },
}
const abilityDescriptions = {
  'Retomar o Fôlego': 'Com uma ação bônus, recupera 1d10 + seu nível de Linha de Frente. Recupera usos nos níveis 10 e 15.',
  'Ponto de Estamina': 'Reserva de estamina usada para criar vantagens ou causar dano extra. O dado utilizado é D6.',
  'Surto de Ação': 'Durante seu turno, realiza uma ação adicional. No nível 17, possui dois usos antes de descansar.',
  'Sentido de Perigo': 'Vantagem em testes de resistência de Destreza contra efeitos que possa ver, desde que não esteja cego, surdo ou incapacitado.',
  'Ação Lendária': 'Uma vez por descanso longo, pode usar movimentação fora do turno. No nível 15, usa movimentação e ação bônus.',
  'Ataque Extra': 'Permite atacar duas vezes no turno; a progressão pode ampliar essa quantidade conforme a classe.',
  'Inspiração Grupal': 'Aliados até 4,5 m recebem vantagem contra amedrontamento e em salvaguardas de morte.',
  'Indomável': 'Pode refazer um teste de resistência que falhou; deve usar o novo resultado.',
  'Resistência Primordial': 'Uma vez por descanso longo, recebe resistência a dano de concussão, perfurante e cortante durante a cena.',
  'Olhar Ameaçador': 'Emite um pulso de chakra para intimidar seres próximos; os detalhes de alcance e usos variam pela progressão.',
  'Crítico Instantâneo': 'Transforma uma falha de ataque em acerto ou trata uma falha em teste como resultado Extremo.',
  'Elusivo': 'Ataques não têm vantagem contra você enquanto não estiver sob efeito de uma condição.',
  'Ataque Furtivo': 'Uma vez por turno, adiciona dados de dano quando acertar com vantagem; os dados aumentam por nível.',
  'Manobra': 'Gasta um dado de manobra (D8) para aplicar opções como precisão, passo evasivo ou desarme.',
  'Movimento sem Armadura': 'Aumenta o deslocamento enquanto não usa armadura nem escudo; o bônus cresce em níveis específicos.',
  'Ação Ardilosa': 'Pode usar ação bônus em cada turno para Disparada, Desengajar ou Esconder.',
  'Máscara da Natureza': 'Permite esconder-se em fenômenos naturais, multidões, florestas ou locais que forneçam camuflagem.',
  'Especialização': 'Escolhe perícias não combativas proficientes para receber vantagem nos testes correspondentes.',
  'Sortudo': 'Quando falha em teste de habilidade ou resistência, pode rolar novamente e usar o novo resultado.',
  'Crítico Aprimorado': 'Escolhe perícias ou atributo para aumentar em +5 o valor de Extremo.',
  'Evasão': 'Em testes de Destreza para metade do dano, não sofre dano no sucesso e sofre metade no fracasso.',
  'Sentido Cego': 'Se puder ouvir, percebe criaturas escondidas ou invisíveis a até 3 metros.',
  'Mente Tranquila': 'Usa uma ação para encerrar em si mesmo um efeito físico que o esteja afligindo.',
  'Aptidão Ninja': 'Distorce jutsus com opções de aptidão; ganha novos usos nos níveis 5, 10, 15 e 20.',
  'Aptidão': 'Escolhe perícias não combativas proficientes para ter vantagem em seus testes.',
  'Defletir Projéteis': 'Usa reação para reduzir dano de ataque à distância em 1d10 + modificador de Destreza + nível.',
  'Conversão': 'Converte vida em chakra ou chakra em vida; a quantidade de dados aumenta nos níveis definidos.',
  'Versatilidade': 'Pode adicionar +5 em uma salvaguarda, desde que o valor não passe de 95%.',
  'Conheça seu Inimigo': 'Após observar/interagir por um minuto fora de combate, aprende comparações de capacidades do alvo.',
  'Potencialização': 'Uma vez por descanso longo, utiliza um jutsu em potência máxima, transformando dados em valores máximos.',
  'Transferência de Turno': 'Transfere o turno para obter vantagem ao atacar no próximo turno.',
  'Astúcia': 'Permite manter dois jutsus que exigem concentração ao mesmo tempo.',
  'Implacável': 'Ao rolar iniciativa sem aptidão ninja, recupera um dado de Aptidão Ninja.',
  'Tática Ninja': 'Após cinco turnos, orienta aliados; efeitos em área contra aliados em 50 m recebem vantagem na resistência.',
}
const clanAbilityDetails = {
  Akimichi: [{ name: 'Baika no Jutsu', description: 'Aumenta o tamanho do usuário e converte calorias em chakra. Efeitos detalhados dependem das regras do mestre.' }],
  Aburame: [{ name: 'Kikaichū no Jutsu', description: 'Insetos parasitas vivem em simbiose com o membro do clã. O guia não define dano, custo ou alcance.' }],
  Hoshigaki: [{ name: 'Amedrontador', description: 'Recebe a perícia Intimidação e +5 no valor Extremo dessa perícia.' }, { name: 'Afinidade Suiton', description: 'Possui afinidade Suiton.' }],
  Hyuuga: [{ name: 'Byakugan', description: 'Visão quase 360°, com ponto cego no pescoço; permite enxergar chakra.' }],
  Inuzuka: [{ name: 'Melhor Amigo', description: 'Possui um parceiro canino de combate.' }],
  Kaguya: [{ name: 'Shikotsumyaku', description: 'Manipulação da própria estrutura óssea. O guia não define efeitos mecânicos adicionais.' }],
  Kazekage: [{ name: 'Manipulação de Areia', description: 'Manipula areia. Jiton é raro e depende de aprovação do mestre.' }],
  Kurama: [{ name: 'Genjutsu Kurama', description: 'Possui genjutsu que pode se tornar fisicamente real; essa possibilidade é rara e depende do mestre.' }],
  Nara: [{ name: 'Kage no Hōjutsu', description: 'Técnica de manipulação de sombras.' }],
  Raikage: [{ name: 'Kuroi Kaminari', description: 'Relâmpago Negro, marcado por uma tatuagem distintiva.' }],
  Sarutobi: [{ name: 'Vontade do Fogo', description: 'Recebe a perícia Vontade e +5 no valor Extremo dessa perícia.' }, { name: 'Afinidade Katon', description: 'Possui afinidade Katon.' }],
  Senju: [{ name: 'Tempo Curto', description: 'O descanso curto recupera PV e chakra como um descanso longo, mas não recupera habilidades.' }, { name: 'Mokuton', description: 'O acesso a Mokuton depende de aprovação do mestre.' }],
  Uchiha: [{ name: 'Ilusionista', description: 'Recebe a perícia Genjutsu e +5 no valor Extremo dessa perícia.' }, { name: 'Sharingan', description: 'Habilidade do clã Uchiha. O guia de criação não define aqui seus efeitos mecânicos; registre os detalhes autorizados pelo mestre.' }],
  Uzumaki: [{ name: 'Selamento', description: 'Recebe a perícia Fūinjutsu e +5 no valor Extremo dessa perícia.' }, { name: 'Afinidade Fuuton', description: 'Possui afinidade Fuuton.' }],
  Yamanaka: [{ name: 'Shintenshin no Jutsu', description: 'Permite transferência de mente a um inimigo. O guia não detalha teste, alcance ou duração.' }],
}
const antecedentAbilityDetails = {
  Amnésico: [{ name: 'Flash', description: 'Memórias do vilão surgem; o mestre decide quando são desbloqueadas.' }],
  ANBU: [{ name: 'Cintilação Corporal', description: 'Técnica concedida pelo treinamento ANBU. O guia não detalha sua mecânica.' }],
  Cientista: [{ name: 'Engenheiro', description: 'Pode criar uma engenhoca em pelo menos 1 turno, a critério do mestre.' }],
  Criminoso: [{ name: 'Lei das Ruas', description: 'Possui conhecimentos e contatos nos negócios da família.' }],
  Espião: [{ name: 'Eu Conheço um Cara', description: 'Em cidades, pode encontrar um contato conhecido.' }],
  Fazendeiro: [{ name: 'Doutor', description: 'Observa sol e direção, morte de seres e comportamento animal.' }],
  Herói: [{ name: 'Moral', description: 'Recebe acolhimento e alimentação em povoações.' }],
  Kage: [{ name: 'Predecessor', description: 'Possui renome social na região. Também recebe um jutsu até rank A ligado ao Kage ancestral, escolhido com o mestre.' }],
  'Médico Shinobi': [{ name: 'Mãos Divinas', description: 'Reserva de cura igual ao nível × 5; 1 uso por descanso longo.' }],
  Mercador: [{ name: 'Entendedor', description: 'Tenta comprar pela metade e identifica golpes.' }],
  Nobre: [{ name: 'Influência Familiar', description: 'Influência familiar regional e externa.' }],
  Renegado: [{ name: 'Invocador', description: 'Possui uma invocação especial.' }],
  Samurai: [{ name: 'Até o Último Homem', description: 'Ao cair, faz testes de Vontade cada vez mais difíceis; a progressão exata depende do mestre.' }],
  Shinobi: [{ name: 'Treinamento Shinobi', description: 'Recebe 3 perícias à escolha, 1000 Ryō e proficiência em armaduras leves e médias. O antecedente também concede +3 em duas perícias à escolha.' }],
}

function Creator({ sheet, onFinish }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(() => ({ ...sheet, skills: Object.fromEntries(allSkills.map((skill) => [skill, { ...defaultSkills[skill], chosen: false }])) }))
  const titles = ['Atributos', 'Clã', 'Antecedente', 'Classe Shinobi', 'Perícias', 'Toques finais']
  const skillSlots = (classSkillSlots[draft.className] ?? 0) + (clanSkillSlots[draft.clan] ?? 0) + (antecedentSkillSlots[draft.antecedent] ?? 0)
  const selectedSkillsCount = Object.values(draft.skills).filter((skill) => skill?.chosen).length
  const next = () => step < 5 ? setStep(step + 1) : onFinish(draft)
  function updateDraftSkill(skill, key, value) {
    setDraft((current) => ({ ...current, skills: { ...current.skills, [skill]: { ...(current.skills[skill] ?? defaultSkills[skill]), [key]: value } } }))
  }
  function toggleDraftSkill(skill, checked) {
    if (checked && selectedSkillsCount >= skillSlots) return
    updateDraftSkill(skill, 'chosen', checked)
  }
  return <main className="character-sheet creator-screen">
    <p className="eyebrow">Criador de personagem</p><h1>{titles[step]}</h1>
    <div className="creator-progress">{titles.map((title, index) => <span className={index <= step ? 'done' : ''} key={title}>{index + 1}</span>)}</div>
    <section className="section-card creator-card">
      {step === 0 && <><p className="helper-text">Distribua e ajuste os atributos. Os valores continuam editáveis na ficha.</p><div className="editor-grid">{Object.entries(attributeNames).map(([key, label]) => <label key={key}>{key} — {label}<input type="number" value={draft.attributes[key]} onChange={(event) => setDraft({ ...draft, attributes: { ...draft.attributes, [key]: Number(event.target.value) } })} /></label>)}</div></>}
      {step === 1 && <><p className="helper-text">O clã define o tema e os benefícios que serão exibidos na ficha.</p><div className="choice-grid">{clans.map((clan) => <button type="button" className={draft.clan === clan ? 'selected' : ''} onClick={() => setDraft({ ...draft, clan })} key={clan}>{clan}</button>)}</div></>}
      {step === 2 && <><p className="helper-text">Escolha o antecedente do personagem.</p><div className="choice-grid">{antecedents.map((antecedent) => <button type="button" className={draft.antecedent === antecedent ? 'selected' : ''} onClick={() => setDraft({ ...draft, antecedent })} key={antecedent}>{antecedent}</button>)}</div></>}
      {step === 3 && <><p className="helper-text">A classe shinobi define as habilidades automáticas exibidas por nível.</p><div className="choice-grid class-choices">{shinobiClasses.map((className) => <button type="button" className={draft.className === className ? 'selected' : ''} onClick={() => setDraft({ ...draft, className, path: className })} key={className}>{className}</button>)}</div></>}
      {step === 4 && <><p className="helper-text">Escolha até {skillSlots} perícias para receberem a base 50% + a dezena do atributo.</p><div className="skill-slot-summary"><strong>{selectedSkillsCount} / {skillSlots}</strong><span>{classSkillSlots[draft.className] ?? 0} da classe · {clanSkillSlots[draft.clan] ?? 0} do clã · {antecedentSkillSlots[draft.antecedent] ?? 0} do antecedente</span></div><div className="creator-skill-list">{skillGroups.flatMap((group) => group.skills).map(([skill, fallbackAttribute]) => { const definition = draft.skills[skill] ?? { ...defaultSkills[skill], attribute: fallbackAttribute }; const values = calculateSkillValues(draft.attributes, definition); return <label className="creator-skill-row" key={skill}><input type="checkbox" checked={Boolean(definition.chosen)} disabled={!definition.chosen && selectedSkillsCount >= skillSlots} onChange={(event) => toggleDraftSkill(skill, event.target.checked)} /><span><b>{skill}</b><small>N {values.normal} · B {values.good} · E {values.extreme}</small></span><select value={definition.attribute} onChange={(event) => updateDraftSkill(skill, 'attribute', event.target.value)}>{Object.entries(attributeNames).map(([key, name]) => <option value={key} key={key}>{key} · {name}</option>)}</select></label> })}</div></>}
      {step === 5 && <div className="editor-grid"><label>Nome<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Nível<input value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value })} /></label><label>PV atual<input type="number" value={draft.pv.current} onChange={(event) => setDraft({ ...draft, pv: { ...draft.pv, current: Number(event.target.value) } })} /></label><label>Chakra atual<input type="number" value={draft.chakra.current} onChange={(event) => setDraft({ ...draft, chakra: { ...draft.chakra, current: Number(event.target.value) } })} /></label></div>}
    </section>
    <div className="creator-actions"><button type="button" onClick={() => step ? setStep(step - 1) : onFinish(sheet)}>Voltar</button><button type="button" className="roll-button" onClick={next}>{step === 5 ? 'Criar ficha' : 'Continuar'}</button></div>
  </main>
}

function readStoredSheet() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.sheet } catch { return null }
}

function createInitialSheet() {
  const saved = readStoredSheet()
  if (!saved) return defaultSheet
  if (saved.sheetVersion !== 3) {
    return { ...defaultSheet, portrait: saved.portrait ?? '', notes: saved.notes ?? '', jutsus: saved.jutsus ?? [], rollHistory: saved.rollHistory ?? [] }
  }
  const savedSkills = Object.fromEntries(allSkills.map((skill) => {
    const value = saved.skills?.[skill]
    if (typeof value === 'number') return [skill, { ...defaultSkills[skill], chosen: value >= 50 }]
    return [skill, { ...defaultSkills[skill], ...value }]
  }))
  return {
    ...defaultSheet, ...saved,
    pv: { ...defaultSheet.pv, ...saved.pv }, chakra: { ...defaultSheet.chakra, ...saved.chakra },
    attributes: { ...defaultSheet.attributes, ...saved.attributes }, skills: savedSkills,
    jutsus: saved.jutsus ?? [], customAbilities: saved.customAbilities ?? [], rollHistory: saved.rollHistory ?? [],
  }
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

function App() {
  const [sheet, setSheet] = useState(createInitialSheet)
  const [activeTab, setActiveTab] = useState('ficha')
  const [isEditing, setIsEditing] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('shinobi-system:theme') ?? 'dark')
  const [selectedAbility, setSelectedAbility] = useState(null)
  const [selectedSkill, setSelectedSkill] = useState('Taijutsu')
  const [draftJutsu, setDraftJutsu] = useState({ name: '', rank: '', chakra: '', description: '' })
  const [draftAbility, setDraftAbility] = useState({ name: '', source: 'Personalizada', level: '', description: '' })
  const [saveMessage, setSaveMessage] = useState('')

  const selectedValue = calculateSkillValues(sheet.attributes, sheet.skills[selectedSkill] ?? defaultSkills[selectedSkill]).normal
  const currentLevel = Math.max(1, Math.min(20, Number(sheet.level) || 1))
  const classAbilities = Object.entries(classProgressions[sheet.className] ?? {}).filter(([level]) => Number(level) <= currentLevel).flatMap(([level, abilities]) => abilities.map((ability) => ({ level, ability })))
  const sneakAttackDice = `${Math.ceil(currentLevel / 2)}d6`
  const maneuverDice = currentLevel >= 20 ? 5 : currentLevel >= 15 ? 4 : currentLevel >= 10 ? 3 : currentLevel >= 5 ? 2 : 1
  const unarmoredMovement = currentLevel >= 18 ? '+9 m' : currentLevel >= 14 ? '+7,5 m' : currentLevel >= 10 ? '+6 m' : currentLevel >= 6 ? '+4,5 m' : currentLevel >= 2 ? '+3 m' : '—'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sheet, savedAt: new Date().toISOString() }))
  }, [sheet])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('shinobi-system:theme', theme)
  }, [theme])

  const rollSummary = useMemo(() => sheet.rollHistory[0], [sheet.rollHistory])

  function updateSheet(updater) { setSheet((current) => updater(current)) }
  function saveNow() { setSaveMessage('Tudo salvo neste navegador.'); window.setTimeout(() => setSaveMessage(''), 2400) }
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
      const { manualValues, ...definition } = current.skills[skill] ?? defaultSkills[skill]
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
    const limits = calculateSkillValues(sheet.attributes, sheet.skills[selectedSkill] ?? defaultSkills[selectedSkill])
    const quality = value <= limits.extreme ? 'Extremo' : value <= limits.good ? 'Bom' : value <= limits.normal ? 'Normal' : 'Falha'
    const roll = { id: Date.now(), skill: selectedSkill, value, quality, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
    updateSheet((current) => ({ ...current, rollHistory: [roll, ...current.rollHistory].slice(0, 20) }))
  }

  function addJutsu(event) {
    event.preventDefault()
    if (!draftJutsu.name.trim()) return
    const jutsu = { ...draftJutsu, id: Date.now() }
    updateSheet((current) => ({ ...current, jutsus: [...current.jutsus, jutsu] }))
    setDraftJutsu({ name: '', rank: '', chakra: '', description: '' })
  }

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
        <p className="demo-notice">Valores da ficha do Yuta podem ser editados e ficam salvos neste navegador.</p>
        {saveMessage && <p className="save-message" role="status">{saveMessage}</p>}
      </header>

      {activeTab === 'ficha' && <>
        <section className="section-card identity-card"><div className="section-heading"><p className="section-kicker">IDENTIDADE SHINOBI</p><h2>Informações</h2></div><div className="identity-grid"><article><span>Antecedente</span>{isEditing ? <input name="antecedent" value={sheet.antecedent ?? ''} onChange={updateText} /> : <strong>{sheet.antecedent || '—'}</strong>}</article><article><span>Ryō</span>{isEditing ? <input type="number" min="0" name="ryo" value={sheet.ryo ?? 0} onChange={updateText} /> : <strong>{sheet.ryo ?? 0}</strong>}</article><article className="identity-wide"><span>Afinidades</span>{isEditing ? <input name="affinity" value={sheet.affinity ?? ''} onChange={updateText} /> : <strong>{sheet.affinity || '—'}</strong>}</article><article className="identity-wide"><span>Proficiências</span>{isEditing ? <textarea name="proficiencies" value={sheet.proficiencies ?? ''} onChange={updateText} /> : <strong>{sheet.proficiencies || '—'}</strong>}</article></div></section>
        <section className="section-card"><div className="section-heading"><p className="section-kicker">BASE</p><h2>Atributos</h2></div><div className="attribute-grid">{Object.entries(sheet.attributes).sort(([, a], [, b]) => b - a).map(([key, value]) => <article className="attribute-card" key={key}><span title={attributeNames[key]}>{key}</span>{isEditing ? <input type="number" min="0" value={value} onChange={(event) => updateAttribute(key, event.target.value)} aria-label={attributeNames[key]} /> : <strong>{value}</strong>}</article>)}</div></section>
        <section className="section-card"><div className="section-heading"><p className="section-kicker">NOTAS</p><h2>Anotações</h2></div><textarea className="notes-field" value={sheet.notes} onChange={(event) => updateSheet((current) => ({ ...current, notes: event.target.value }))} placeholder="Escreva anotações da campanha..." /></section>
      </>}

      {activeTab === 'pericias' && <section className="section-card tab-content"><div className="section-heading"><p className="section-kicker">D100</p><h2>Perícias</h2><p className="helper-text">Escolhidas: {Object.values(sheet.skills).filter((skill) => skill?.chosen).length}. Os valores são calculados pela dezena do atributo: 50 + dezena para escolhidas; 10 + dezena para as demais.</p></div>{skillGroups.map((group) => <div className="skill-group" key={group.title}><h3>{group.title}</h3><div className="skill-list skill-table">{group.skills.map(([skill, fallbackAttribute]) => { const definition = sheet.skills[skill] ?? { ...defaultSkills[skill], attribute: fallbackAttribute }; const values = calculateSkillValues(sheet.attributes, definition); return <div className={`skill-row ${isEditing ? 'skill-row-editing' : ''}`} key={skill}><div><strong>{skill}</strong><span>{definition.attribute}</span></div>{isEditing ? <><label className="skill-check"><input type="checkbox" checked={Boolean(definition.chosen)} onChange={(event) => updateSkill(skill, 'chosen', event.target.checked)} /> escolhida</label><select aria-label={`Atributo de ${skill}`} value={definition.attribute} onChange={(event) => updateSkill(skill, 'attribute', event.target.value)}>{Object.entries(attributeNames).map(([key, name]) => <option value={key} key={key}>{key} · {name}</option>)}</select><div className="skill-edit-fields"><label>N<input aria-label={`${skill} normal`} type="number" min="0" value={values.normal} onChange={(event) => updateSkillValue(skill, 'normal', event.target.value)} /></label><label>B<input aria-label={`${skill} bom`} type="number" min="0" value={values.good} onChange={(event) => updateSkillValue(skill, 'good', event.target.value)} /></label><label>E<input aria-label={`${skill} extremo`} type="number" min="0" value={values.extreme} onChange={(event) => updateSkillValue(skill, 'extreme', event.target.value)} /></label><button type="button" onClick={() => restoreAutomaticSkillValues(skill)}>Auto</button></div></> : <div className="skill-values"><b>N {values.normal}</b><b>B {values.good}</b><b>E {values.extreme}</b></div>}</div> })}</div></div>)}</section>}

      {activeTab === 'habilidades' && <section className="section-card tab-content"><div className="section-heading"><p className="section-kicker">CLASSE SHINOBI</p><h2>{sheet.className || 'Classe não definida'}</h2><p className="helper-text">Nível atual: {currentLevel}. Toque em uma habilidade para ler o efeito.</p></div>{sheet.className === 'Assassino' && <div className="ability-status"><article><span>Ataque Furtivo</span><strong>{sneakAttackDice}</strong></article><article><span>Manobras</span><strong>{maneuverDice}d8</strong></article><article><span>Sem armadura</span><strong>{unarmoredMovement}</strong></article></div>}<div className="ability-list">{classAbilities.length ? classAbilities.map(({ level, ability }, index) => <div key={`${level}-${ability}-${index}`}><button className="ability-row" type="button" onClick={() => setSelectedAbility(selectedAbility?.ability === ability && selectedAbility?.level === level ? null : { level, ability })}><span>Nível {level}</span><strong>{ability}</strong><b>{selectedAbility?.ability === ability && selectedAbility?.level === level ? '−' : '+'}</b></button>{selectedAbility?.ability === ability && selectedAbility?.level === level && <div className="ability-description">{getAbilityDescription(ability)}</div>}</div>) : <p className="empty-state">Defina uma classe e um nível numérico para listar as habilidades.</p>}</div><div className="section-heading progression-heading"><p className="section-kicker">EVOLUÇÃO COMPLETA</p><h2>Próximos níveis</h2></div><div className="level-progression">{Array.from({ length: 20 }, (_, index) => index + 1).map((level) => <article className={level <= currentLevel ? 'unlocked' : ''} key={level}><strong>Nível {level}</strong><div>{(classProgressions[sheet.className]?.[level] ?? ['Sem mudança registrada']).map((ability) => <span key={ability}>{ability}</span>)}</div></article>)}</div></section>}

      {activeTab === 'habilidades' && <section className="section-card origin-abilities"><div className="section-heading"><p className="section-kicker">ORIGENS E TÉCNICAS</p><h2>Outras habilidades</h2></div><div className="origin-list">{[...(clanAbilityDetails[sheet.clan] ?? []), ...(antecedentAbilityDetails[sheet.antecedent] ?? [])].map((ability) => <article key={ability.name}><span>{ability.name}</span><p>{ability.description}</p></article>)}{!(clanAbilityDetails[sheet.clan]?.length || antecedentAbilityDetails[sheet.antecedent]?.length) && <p className="empty-state">Ainda não há habilidade automática cadastrada para este clã ou antecedente.</p>}</div>{(sheet.customAbilities ?? []).map((ability) => <article className="custom-ability" key={ability.id}><div><p className="section-kicker">{ability.source}{ability.level && ` · Nível ${ability.level}`}</p><h3>{ability.name}</h3><p>{ability.description || 'Sem descrição cadastrada.'}</p></div>{isEditing && <button type="button" onClick={() => removeCustomAbility(ability.id)} aria-label={`Remover ${ability.name}`}>×</button>}</article>)}{isEditing && <form className="custom-ability-form" onSubmit={addCustomAbility}><h3>Adicionar habilidade</h3><input placeholder="Nome da habilidade" value={draftAbility.name} onChange={(event) => setDraftAbility({ ...draftAbility, name: event.target.value })} /><div><input placeholder="Origem (clã, item, etc.)" value={draftAbility.source} onChange={(event) => setDraftAbility({ ...draftAbility, source: event.target.value })} /><input type="number" min="1" placeholder="Nível" value={draftAbility.level} onChange={(event) => setDraftAbility({ ...draftAbility, level: event.target.value })} /></div><textarea placeholder="Descrição e efeitos" value={draftAbility.description} onChange={(event) => setDraftAbility({ ...draftAbility, description: event.target.value })} /><button className="roll-button" type="submit">Adicionar habilidade</button></form>}</section>}

      {activeTab === 'rolagens' && <section className="roll-panel tab-content"><div><p className="section-kicker">TESTE</p><h2>Rolagem D100</h2><label className="roll-label" htmlFor="skill-select">Perícia de demonstração</label><select id="skill-select" value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}>{allSkills.map((skill) => <option key={skill}>{skill}</option>)}</select><p>Faixas desta demonstração: Normal 50, Bom 25, Extremo 10. A perícia escolhida está em {selectedValue}%.</p></div><button type="button" className="roll-button" onClick={rollD100}>Rolar D100</button><p className="roll-result" aria-live="polite">{rollSummary ? `${rollSummary.skill}: ${rollSummary.value} — ${rollSummary.quality}` : 'Nenhuma rolagem realizada.'}</p><div className="history"><h3>Histórico</h3>{sheet.rollHistory.length ? sheet.rollHistory.map((roll) => <div className="history-row" key={roll.id}><span>{roll.skill} · {roll.time}</span><strong>{roll.value} — {roll.quality}</strong></div>) : <p>Nenhuma rolagem salva.</p>}</div></section>}

      {activeTab === 'jutsus' && <section className="section-card tab-content"><div className="section-heading"><p className="section-kicker">BIBLIOTECA PESSOAL</p><h2>Jutsus</h2><p className="helper-text">Cadastre técnicas próprias enquanto a biblioteca oficial não é fornecida.</p></div><form className="jutsu-form" onSubmit={addJutsu}><input placeholder="Nome do jutsu" value={draftJutsu.name} onChange={(event) => setDraftJutsu({ ...draftJutsu, name: event.target.value })} /><input placeholder="Rank" value={draftJutsu.rank} onChange={(event) => setDraftJutsu({ ...draftJutsu, rank: event.target.value })} /><input type="number" placeholder="Custo de chakra" value={draftJutsu.chakra} onChange={(event) => setDraftJutsu({ ...draftJutsu, chakra: event.target.value })} /><textarea placeholder="Descrição" value={draftJutsu.description} onChange={(event) => setDraftJutsu({ ...draftJutsu, description: event.target.value })} /><button className="roll-button" type="submit">Adicionar jutsu</button></form><div className="jutsu-list">{sheet.jutsus.map((jutsu) => <article className="jutsu-entry" key={jutsu.id}><div><h3>{jutsu.name}</h3><p>{jutsu.rank && `Rank ${jutsu.rank}`}{jutsu.chakra && ` · ${jutsu.chakra} Chakra`}</p><p>{jutsu.description}</p></div><button type="button" onClick={() => removeJutsu(jutsu.id)} aria-label={`Remover ${jutsu.name}`}>×</button></article>)}{!sheet.jutsus.length && <p className="empty-state">Nenhum jutsu particular cadastrado.</p>}</div></section>}

      <nav className="bottom-nav" aria-label="Navegação principal">{[['ficha', '◈', 'Ficha'], ['pericias', '⌁', 'Perícias'], ['habilidades', '✦', 'Habilidades'], ['rolagens', '◎', 'Rolagens'], ['jutsus', '忍', 'Jutsus']].map(([tab, icon, label]) => <button className={`nav-item ${activeTab === tab ? 'active' : ''}`} type="button" key={tab} onClick={() => setActiveTab(tab)}><span>{icon}</span>{label}</button>)}</nav>
    </main>
  )
}

export default App

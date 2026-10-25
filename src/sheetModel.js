export const STORAGE_KEY = 'shinobi-system:yuta-uchiha'

export const skillGroups = [
  { title: 'Combativas', skills: [['Taijutsu', 'DEX'], ['Jutsu', 'ART'], ['Esquiva', 'DEX'], ['Contra-ataque', 'DEX'], ['Bloqueio', 'CON'], ['Imobilizar', 'FOR'], ['Atletismo', 'DEX'], ['Acrobacia', 'FOR'], ['Arremesso', 'DEX']] },
  { title: 'Inteligência', skills: [['Genjutsu', 'ART'], ['Fūinjutsu', 'ART'], ['Intuição', 'INT'], ['Percepção', 'INT'], ['Investigação', 'INT'], ['Furtividade', 'INT'], ['História', 'INT'], ['Encontrar', 'INT'], ['Sobrevivência', 'INT'], ['Natureza', 'INT'], ['Medicina', 'INT'], ['Ninjutsu', 'ART'], ['Roubo', 'DEX'], ['Farmacologia', 'INT'], ['Aprendizagem', 'INT'], ['Escutar', 'INT']] },
  { title: 'Sociais', skills: [['Atuação', 'CAR'], ['Enganação', 'CAR'], ['Intimidação', 'CAR'], ['Lábia', 'CAR'], ['Acalmar', 'CAR'], ['Adestrar Animais', 'CAR'], ['Sorte', 'CAR'], ['Vontade', 'CAR']] },
]

export const allSkills = skillGroups.flatMap((group) => group.skills.map(([name]) => name))
export const chosenYutaSkills = ['Jutsu', 'Genjutsu', 'Taijutsu', 'Esquiva', 'Atletismo', 'Arremesso', 'Intuição', 'Investigação', 'Furtividade', 'História', 'Ninjutsu', 'Roubo', 'Aprendizagem', 'Escutar', 'Acalmar', 'Vontade', 'Acrobacia']
export const defaultSkills = Object.fromEntries(skillGroups.flatMap((group) => group.skills).map(([name, attribute]) => [name, { attribute, chosen: chosenYutaSkills.includes(name), extremeBonus: name === 'Genjutsu' ? 5 : 0 }]))

export const defaultSheet = {
  sheetVersion: 3,
  name: 'Yuta Uchiha', clan: 'Uchiha', level: 1, path: 'Assassino', className: 'Assassino', antecedent: 'Shinobi',
  pv: { current: 21, max: 21 }, chakra: { current: 41, max: 41 }, movement: '24 m', ryo: 1000, affinity: 'Katon, Fuuton',
  proficiencies: 'Armaduras leves, armas ninjas e uma arma extra à escolha',
  attributes: { FOR: 20, DEX: 50, CON: 30, INT: 38, ART: 40, CAR: 15 },
  skills: defaultSkills, notes: '', portrait: '', jutsus: [], customAbilities: [], rollHistory: [],
}

export const attributeNames = { FOR: 'Força', DEX: 'Destreza', CON: 'Constituição', INT: 'Inteligência', ART: 'Arte Ninja', CAR: 'Carisma' }
export const classSkillSlots = { 'Linha de Frente': 9, Assassino: 12, Suporte: 15 }
export const clanSkillSlots = { Hoshigaki: 1, Sarutobi: 1, Uchiha: 1, Uzumaki: 1 }
export const antecedentSkillSlots = { Amnésico: 3, ANBU: 2, Cientista: 2, Criminoso: 2, Espião: 2, Fazendeiro: 2, Herói: 2, Kage: 2, 'Médico Shinobi': 3, Mercador: 2, Nobre: 2, Renegado: 2, Samurai: 3, Shinobi: 3 }
export function calculateSkillValues(attributes, skill) {
  const tens = Math.floor((Number(attributes[skill.attribute]) || 0) / 10)
  const normal = (skill.chosen ? 50 : 10) + tens + (skill.normalBonus ?? 0)
  const automaticValues = { normal, good: Math.floor(normal / 2), extreme: Math.floor(normal / 10) + (skill.extremeBonus ?? 0) }
  return { ...automaticValues, ...(skill.manualValues ?? {}) }
}
export function getVisibleSkills(sheet, training = 'all', order = 'value-desc') {
  return skillGroups.flatMap(group => group.skills.map(([name, attribute]) => {
    const definition = sheet.skills[name] ?? { ...defaultSkills[name], attribute }
    return { name, group: group.title, definition, values: calculateSkillValues(sheet.attributes, definition) }
  })).filter(skill => training === 'trained' ? skill.definition.chosen : training === 'untrained' ? !skill.definition.chosen : true)
    .sort((a, b) => (order === 'value-desc' ? b.values.normal - a.values.normal : 0) || a.name.localeCompare(b.name, 'pt-BR'))
}

export const clans = ['Akimichi', 'Aburame', 'Hoshigaki', 'Hyuuga', 'Inuzuka', 'Kaguya', 'Kazekage', 'Kurama', 'Nara', 'Raikage', 'Sarutobi', 'Senju', 'Uchiha', 'Uzumaki', 'Yamanaka']
export const antecedents = ['Amnésico', 'ANBU', 'Cientista', 'Criminoso', 'Espião', 'Fazendeiro', 'Herói', 'Kage', 'Médico Shinobi', 'Mercador', 'Nobre', 'Renegado', 'Samurai', 'Shinobi']
export const shinobiClasses = ['Linha de Frente', 'Assassino', 'Suporte']
export const assassinProgression = {
  1: ['Ataque Furtivo (1d6)', 'Manobra (1/5)'], 2: ['Movimento sem Armadura (+3 m)'], 3: ['Ataque Furtivo (2d6)', 'Ação Ardilosa'], 4: ['Máscara da Natureza'],
  5: ['Ataque Furtivo (3d6)', 'Ataque Extra', 'Ação Lendária (1/2)', 'Manobra (2/5)', '+3 m (1/4)'], 6: ['Ataque Furtivo (3d6)'],
  7: ['Ataque Furtivo (4d6)', 'Especialização (1/2)'], 8: ['Ataque Furtivo (4d6)', 'Sortudo (1/2)'], 9: ['Ataque Furtivo (5d6)', 'Crítico Aprimorado'],
  10: ['Ataque Furtivo (5d6)', 'Evasão', 'Manobra (3/5)', '+3 m (2/4)'], 11: ['Ataque Furtivo (6d6)', 'Olhar Ameaçador (1/2)'], 12: ['Ataque Furtivo (6d6)'],
  13: ['Ataque Furtivo (7d6)', 'Sortudo (2/2)'], 14: ['Ataque Furtivo (7d6)', 'Especialização (2/2)'], 15: ['Ataque Furtivo (8d6)', 'Ação Lendária (2/2)', 'Manobra (4/5)', '+3 m (3/4)'],
  16: ['Ataque Furtivo (8d6)'], 17: ['Ataque Furtivo (9d6)', 'Sentido Cego'], 18: ['Ataque Furtivo (9d6)', 'Mente Tranquila'], 19: ['Ataque Furtivo (10d6)'],
  20: ['Ataque Furtivo (10d6)', 'Olhar Ameaçador (2/2)', 'Manobra (5/5)', '+3 m (4/4)'],
}
export const classProgressions = {
  'Linha de Frente': { 1: ['Retomar o Fôlego', 'Ponto de Estamina'], 2: ['Surto de Ação'], 3: ['Sentido de Perigo'], 5: ['Ação Lendária', 'Ataque Extra', '+3m de movimentação'], 8: ['Inspiração Grupal'], 9: ['Indomável'], 10: ['Resistência Primordial'], 11: ['Olhar Ameaçador'], 12: ['Ataque Extra (2/2)'], 15: ['Ação Lendária (2/2)'], 17: ['Surto de Ação (2/2)'], 18: ['Crítico Instantâneo'], 19: ['Elusivo'] },
  Assassino: assassinProgression,
  Suporte: { 1: ['Aptidão Ninja', 'Aptidão'], 2: ['Sentido de Perigo'], 3: ['Defletir Projéteis'], 4: ['Conversão'], 5: ['Versatilidade', 'Ação Lendária'], 6: ['Conheça seu Inimigo'], 7: ['Evasão'], 8: ['Aptidão (2/2)', 'Conversão (2/5)'], 9: ['Indomável'], 10: ['Potencialização'], 11: ['Olhar Ameaçador'], 12: ['Transferência de Turno'], 13: ['Astúcia'], 14: ['Ataque Extra'], 15: ['Ação Lendária (2/2)'], 16: ['Implacável'], 17: ['Sentido Cego'], 18: ['Tática Ninja'] },
}
export const abilityDescriptions = {
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
export const clanAbilityDetails = {
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
export const antecedentAbilityDetails = {
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

export function readStoredSheet() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.sheet } catch { return null }
}

export function createInitialSheet() {
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

export function createNewSheet() {
  return { ...structuredClone(defaultSheet), name: '', sessionName: 'Encontro 1', clan: clans[0], antecedent: 'Shinobi', className: 'Linha de Frente', path: 'Linha de Frente', affinity: '', proficiencies: '', ryo: 0, movement: '', pv: { current: 1, max: 1 }, chakra: { current: 1, max: 1 }, attributes: Object.fromEntries(Object.keys(attributeNames).map(key => [key, 0])), skills: Object.fromEntries(allSkills.map(name => [name, { ...defaultSkills[name], chosen: false, extremeBonus: 0 }])) }
}


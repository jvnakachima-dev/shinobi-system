import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDiceCost } from '../src/dice.js'
import { createNewSheet, getVisibleSkills } from '../src/sheetModel.js'

test('chakra costs retain dice notation and reject fixed or invalid costs', () => {
  for (const [input, expected] of [['1d8', '1d8'], [' 2D6 + 2 ', '2d6+2'], ['3d10-1', '3d10-1'], ['1d8+0', '1d8']]) assert.equal(normalizeDiceCost(input), expected)
  for (const input of ['8', 8, '', '0d8', '1d0', '1d1', '-1d8', '1.5d6', '1d8;alert(1)', '2d6+text', '9999999999999999999d8']) assert.equal(normalizeDiceCost(input), null)
})

test('old sheets gain untrained INT Percepção without changing saved skill data', () => {
  const sheet = createNewSheet()
  delete sheet.skills.Percepção
  sheet.attributes.INT = 38
  const before = JSON.stringify(sheet)
  const skill = getVisibleSkills(sheet).find(item => item.name === 'Percepção')
  assert.equal(skill.definition.attribute, 'INT')
  assert.equal(skill.definition.chosen, false)
  assert.equal(skill.values.normal, 13)
  assert.equal(JSON.stringify(sheet), before)
})

test('training filters and descending skill order honor manual values across categories', () => {
  const sheet = createNewSheet()
  sheet.skills.Percepção.chosen = true
  sheet.skills.Percepção.manualValues = { normal: 75 }
  sheet.skills.Taijutsu.chosen = true
  sheet.skills.Taijutsu.manualValues = { normal: 60 }
  sheet.skills.Sorte.manualValues = { normal: 80 }
  assert.deepEqual(getVisibleSkills(sheet).slice(0, 3).map(item => item.name), ['Sorte', 'Percepção', 'Taijutsu'])
  assert.deepEqual(getVisibleSkills(sheet, 'trained').map(item => item.name), ['Percepção', 'Taijutsu'])
  assert.ok(getVisibleSkills(sheet, 'untrained').every(item => !item.definition.chosen))
  assert.equal(getVisibleSkills(sheet, 'all', 'alphabetical')[0].name, 'Acalmar')
})

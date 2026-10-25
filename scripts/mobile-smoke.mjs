import assert from 'node:assert/strict'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'
import { createApp } from '../server/index.js'
import { createNewSheet } from '../src/sheetModel.js'

// Runs only against its own temporary, in-memory database, never live accounts.
const { server, db } = await createApp({ database: ':memory:' })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
let browser
try {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (!process.env.CI && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
  browser = await chromium.launch({ executablePath, headless: true })
  for (const width of [320, 360, 390, 430, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'pt-BR' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    async function layout(label) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      assert.equal(overflow, false, `${label}: horizontal page overflow at ${width}px`)
      const smallInputs = await page.locator('input:not([type="checkbox"]):not([type="file"]), select, textarea').evaluateAll(inputs => inputs.filter(input => input.getClientRects().length && parseFloat(getComputedStyle(input).fontSize) < 16).length)
      if (width <= 600) assert.equal(smallInputs, 0, `${label}: inputs smaller than 16px`)
    }
    await page.goto(base + '/shinobi-system/')
    await page.getByRole('heading', { name: 'Entrar', exact: true }).waitFor()
    await layout('login')
    await page.getByRole('button', { name: 'Ainda não tenho conta' }).tap()
    await page.getByLabel('Seu nome').fill('Jogador shinobi')
    await page.getByLabel('E-mail', { exact: true }).fill(`mobile-${randomUUID()}@example.com`)
    await page.getByLabel('Senha', { exact: true }).fill(randomUUID())
    await page.getByRole('button', { name: 'Criar minha conta' }).tap()
    await page.getByRole('heading', { name: 'Personagens e encontros' }).waitFor()
    await layout('dashboard')
    await page.getByRole('button', { name: '+ Criar personagem', exact: true }).tap()
    await page.getByLabel('Nome do personagem', { exact: true }).fill('Akira Uchiha')
    await page.getByLabel('Mesa / campanha (opcional)').fill('Crônicas de Konoha')
    for (let step = 0; step < 6; step++) {
      await layout(`creator step ${step + 1}`)
      if (step === 2) await page.getByRole('button', { name: 'Uchiha', exact: true }).tap()
      if (step === 4) await page.getByRole('button', { name: 'Assassino', exact: true }).tap()
      if (step === 5) { await page.getByRole('checkbox').first().check(); await page.getByRole('checkbox', { name: 'Treinar Percepção', exact: true }).check() }
      await page.getByRole('button', { name: 'Continuar', exact: true }).tap()
    }
    await page.getByLabel('PV inicial e máximo').fill('25')
    await page.getByLabel('Chakra inicial e máximo').fill('40')
    await layout('review')
    await page.getByRole('button', { name: 'Criar ficha', exact: true }).tap()
    await page.getByRole('heading', { name: 'Akira Uchiha', exact: true }).waitFor()
    await layout('character sheet')
    for (const name of ['Diminuir PV', 'Aumentar PV', 'Salvar ficha']) {
      const rect = await page.getByRole('button', { name, exact: true }).boundingBox()
      assert.ok(rect.height >= 44 && rect.width >= 44, `${name}: insufficient touch area`)
    }
    await page.getByRole('button', { name: 'Editar', exact: true }).tap()
    await layout('sheet editing')
    await page.getByRole('navigation').getByRole('button', { name: /Perícias/ }).tap()
    await page.getByLabel('Percepção normal', { exact: true }).fill('75')
    await page.getByLabel('Taijutsu normal', { exact: true }).fill('60')
    await page.getByLabel('Treinamento', { exact: true }).selectOption('trained')
    assert.equal(await page.locator('.skill-row').count(), 2)
    assert.equal(await page.locator('.skill-row').first().locator('strong').first().textContent(), 'Percepção')
    await page.getByLabel('Treinamento', { exact: true }).selectOption('untrained')
    assert.equal(await page.locator('.skill-row').filter({ has: page.getByText('Percepção', { exact: true }) }).count(), 0)
    await page.getByLabel('Treinamento', { exact: true }).selectOption('all')
    await page.getByLabel('Ordenação', { exact: true }).selectOption('alphabetical')
    assert.equal(await page.locator('.skill-row').first().locator('strong').first().textContent(), 'Acalmar')
    await page.getByLabel('Ordenação', { exact: true }).selectOption('value-desc')
    await layout('filtered skills')
    for (const tab of ['Habilidades', 'Rolagens', 'Jutsus']) {
      await page.getByRole('navigation').getByRole('button', { name: new RegExp(tab) }).tap()
      await layout(tab)
    }
    await page.getByLabel('Nome do jutsu', { exact: true }).fill('Katon de teste')
    await page.getByLabel('Custo de chakra em dados', { exact: true }).fill('8')
    await page.getByRole('button', { name: 'Adicionar jutsu', exact: true }).tap()
    await page.getByRole('alert').waitFor()
    assert.equal(await page.locator('.jutsu-entry').count(), 0)
    await page.getByLabel('Custo de chakra em dados', { exact: true }).fill(' 2D6 + 2 ')
    await page.getByRole('button', { name: 'Adicionar jutsu', exact: true }).tap()
    assert.match(await page.locator('.jutsu-entry').textContent(), /2d6\+2 Chakra/)
    await layout('dice chakra cost')
    await page.getByRole('navigation').getByRole('button', { name: /Ficha/ }).tap()
    await page.getByRole('button', { name: 'Diminuir PV', exact: true }).tap()
    await page.getByRole('button', { name: 'Salvar ficha', exact: true }).tap()
    await page.getByText('Ficha salva na sua conta.', { exact: true }).waitFor()
    await page.getByRole('button', { name: /Minhas fichas/ }).tap()
    await page.getByRole('button', { name: 'Preparar próximo encontro', exact: true }).tap()
    await page.getByLabel('Nome do encontro', { exact: true }).fill('Encontro 2 — Nas fronteiras de Konoha')
    await layout('copy encounter dialog')
    await page.getByRole('button', { name: 'Criar cópia do encontro', exact: true }).tap()
    await page.getByRole('heading', { name: 'Akira Uchiha', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Diminuir PV', exact: true }).tap()
    await page.getByRole('button', { name: 'Salvar ficha', exact: true }).tap()
    await page.getByText('Ficha salva na sua conta.', { exact: true }).waitFor()
    await page.getByRole('button', { name: /Minhas fichas/ }).tap()
    const original = page.locator('.sheet-card').filter({ has: page.getByText('Encontro 1', { exact: true }) })
    assert.match(await original.textContent(), /PV 24\/25/)
    await page.reload()
    await page.getByRole('heading', { name: 'Personagens e encontros' }).waitFor()
    assert.equal(await page.locator('.sheet-card').count(), 2)
    await layout('saved dashboard')
    const saved = await (await context.request.get(base + '/api/sheets')).json()
    assert.ok(saved.sheets.every(record => record.data.jutsus[0].chakra === '2d6+2'))
    assert.ok(saved.sheets.every(record => record.data.skills.Percepção.chosen && record.data.skills.Percepção.manualValues.normal === 75))
    if (width === 390) {
      const legacy = createNewSheet()
      legacy.name = 'Personagem antigo'
      delete legacy.skills.Percepção
      legacy.jutsus = [{ id: 'legacy', name: 'Técnica antiga', chakra: 8, rank: '', description: '' }]
      const imported = await context.request.post(base + '/api/sheets', { data: { campaign: '', data: legacy } })
      assert.equal(imported.status(), 201)
      await page.reload()
      await page.locator('.sheet-card').filter({ has: page.getByRole('heading', { name: 'Personagem antigo', exact: true }) }).getByRole('button', { name: 'Abrir ficha', exact: true }).tap()
      await page.getByRole('navigation').getByRole('button', { name: /Perícias/ }).tap()
      await page.getByText('Percepção', { exact: true }).waitFor()
      await page.getByRole('navigation').getByRole('button', { name: /Jutsus/ }).tap()
      await page.getByText(/Custo antigo: 8/).waitFor()
      await page.getByRole('button', { name: 'Editar', exact: true }).tap()
      await page.getByLabel('Custo de Técnica antiga em dados', { exact: true }).fill('1d8')
      await page.getByRole('button', { name: 'Salvar ficha', exact: true }).tap()
      await page.getByText('Ficha salva na sua conta.', { exact: true }).waitFor()
      const updated = await (await context.request.get(base + '/api/sheets')).json()
      assert.equal(updated.sheets.find(record => record.data.name === 'Personagem antigo').data.jutsus[0].chakra, '1d8')
      await page.getByRole('button', { name: /Minhas fichas/ }).tap()
    }
    if (process.env.MOBILE_SCREENSHOT_DIR && width === 390) {
      mkdirSync(process.env.MOBILE_SCREENSHOT_DIR, { recursive: true })
      await page.screenshot({ path: join(process.env.MOBILE_SCREENSHOT_DIR, 'painel-celular.png'), fullPage: true })
    }
    assert.deepEqual(errors, [])
    await context.close()
    console.log(`Mobile ${width}px: signup, creation, editing, skill filters/order, Percepção, dice costs, saved copies and touch controls passed.`)
  }
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
  await db.close()
}

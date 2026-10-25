// Keep mixed dice notation as text; never roll or evaluate a cost on save.
export function normalizeDiceCost(value) {
  if (typeof value !== 'string' || value.length > 60) return null
  const expression = value.toLowerCase().replace(/\s+/gu, '')
  if (!/^[1-9]\d*d[1-9]\d*(?:[+-](?:[1-9]\d*d[1-9]\d*|\d+))*$/.test(expression)) return null
  const normalized = []
  for (const term of expression.match(/[+-]?[^+-]+/gu)) {
    const sign = /^[+-]/.test(term) ? term[0] : ''
    const body = sign ? term.slice(1) : term
    if (body.includes('d')) {
      const [count, faces] = body.split('d').map(Number)
      if (!Number.isSafeInteger(count) || !Number.isSafeInteger(faces) || faces < 2) return null
      normalized.push(`${sign}${count}d${faces}`)
    } else {
      const modifier = Number(body)
      if (!Number.isSafeInteger(modifier)) return null
      if (modifier) normalized.push(`${sign}${modifier}`)
    }
  }
  return normalized.join('')
}

// Store the notation itself; never roll or evaluate a chakra cost on save.
export function normalizeDiceCost(value) {
  if (typeof value !== 'string' || value.length > 60) return null
  const match = value.toLowerCase().replace(/\s+/gu, '').match(/^([1-9]\d*)d([1-9]\d*)(?:([+-])(\d+))?$/)
  if (!match) return null
  const [, count, faces, sign, modifier] = match
  if (![count, faces, modifier ?? '0'].every(number => Number.isSafeInteger(Number(number))) || Number(faces) < 2) return null
  return `${count}d${faces}${modifier && Number(modifier) ? `${sign}${Number(modifier)}` : ''}`
}

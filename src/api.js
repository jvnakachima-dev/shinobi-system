export async function api(path, options = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...options.headers }, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
  } catch { throw new Error('Não foi possível conectar. Confira sua conexão e tente novamente.') }
  const data = await response.json().catch(() => ({ error: 'Servidor indisponível. Verifique se a API está iniciada.' }))
  if (!response.ok) { const error = new Error(data.error || 'Não foi possível concluir a operação.'); error.status = response.status; throw error }
  return data
}

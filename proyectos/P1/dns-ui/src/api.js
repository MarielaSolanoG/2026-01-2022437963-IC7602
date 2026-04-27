const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export async function getDnsRecords() {
  const r = await fetch(`${BASE}/api/records`)
  if (!r.ok) throw new Error('Error al obtener registros')
  return r.json()
}

export async function createDnsRecord(body) {
  const r = await fetch(`${BASE}/api/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error('Error al crear registro')
  return r.json()
}

export async function updateDnsRecord(id, body) {
  const r = await fetch(`${BASE}/api/records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error('Error al actualizar')
  return r.json()
}

export async function deleteDnsRecord(id) {
  const r = await fetch(`${BASE}/api/records/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Error al eliminar')
}

export async function getIpCountry() {
  const r = await fetch(`${BASE}/api/ip-country`)
  if (!r.ok) throw new Error('Error al obtener IP to Country')
  return r.json()
}

export async function createIpCountry(body) {
  const r = await fetch(`${BASE}/api/ip-country`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error('Error al crear')
  return r.json()
}

export async function updateIpCountry(id, body) {
  const r = await fetch(`${BASE}/api/ip-country/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error('Error al actualizar')
  return r.json()
}

export async function deleteIpCountry(id) {
  const r = await fetch(`${BASE}/api/ip-country/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Error al eliminar')
}
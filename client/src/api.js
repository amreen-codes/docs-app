export async function api(path, { method = 'GET', body, form } = {}) {
  const token = localStorage.getItem('token')
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch('/api' + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}
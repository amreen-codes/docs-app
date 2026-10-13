import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from './api'

export default function Dashboard() {
  const nav = useNavigate()
  const [docs, setDocs] = useState({ owned: [], shared: [] })
  const [error, setError] = useState('')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const load = () => api('/docs').then(setDocs).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  async function create() {
    const d = await api('/docs', { method: 'POST', body: {} })
    nav('/doc/' + d.id)
  }
  async function upload(e) {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const d = await api('/upload', { method: 'POST', form })
      nav('/doc/' + d.id)
    } catch (err) { setError(err.message) }
    e.target.value = ''
  }
  function logout() { localStorage.clear(); nav('/login') }

  const Row = ({ d, shared }) => (
    <li>
      <Link to={'/doc/' + d.id}>{d.title}</Link>
      <span className="muted">
        {shared ? `by ${d.owner?.name} · ${d.permission}` : 'Owner'} · {new Date(d.updatedAt).toLocaleString()}
      </span>
    </li>
  )

  return (
    <div className="card">
      <div className="bar">
        <h1>My documents</h1>
        <span className="muted">{user.name}</span>
        <button onClick={logout}>Log out</button>
      </div>
      <div className="bar">
        <button onClick={create}>+ New document</button>
        <label className="upload">
          Upload .txt / .md
          <input type="file" accept=".txt,.md" onChange={upload} hidden />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <h2>Owned by me</h2>
      <ul>{docs.owned.map((d) => <Row key={d.id} d={d} />)}</ul>
      {!docs.owned.length && <p className="muted">No documents yet.</p>}
      <h2>Shared with me</h2>
      <ul>{docs.shared.map((d) => <Row key={d.id} d={d} shared />)}</ul>
      {!docs.shared.length && <p className="muted">Nothing shared with you yet.</p>}
    </div>
  )
}
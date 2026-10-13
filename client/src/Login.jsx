import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('alice@test.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    try {
      const r = await api('/login', { method: 'POST', body: { email, password } })
      localStorage.setItem('token', r.token)
      localStorage.setItem('user', JSON.stringify(r.user))
      nav('/')
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="card narrow">
      <h1>Docs</h1>
      <form onSubmit={submit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        {error && <p className="error">{error}</p>}
        <button>Log in</button>
      </form>
      <p className="muted">Demo users: alice@test.com, bob@test.com, carol@test.com (password: password123)</p>
    </div>
  )
}
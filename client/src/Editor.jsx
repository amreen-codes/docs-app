import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { api } from './api'

export default function Editor() {
  const { id } = useParams()
  const [doc, setDoc] = useState(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const timer = useRef(null)
  const canEdit = doc && doc.access !== 'view'

  const editor = useEditor({
    extensions: [StarterKit.configure({ underline: false }), Underline],
    content: '',
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      setStatus('Saving...')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => save({ content: editor.getHTML() }), 800)
    },
  })

  useEffect(() => {
    api('/docs/' + id).then((d) => { setDoc(d); setTitle(d.title) }).catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    if (editor && doc) {
      editor.commands.setContent(doc.content || '', false)
      editor.setEditable(doc.access !== 'view')
    }
  }, [editor, doc])

  async function save(patch) {
    try { await api('/docs/' + id, { method: 'PUT', body: patch }); setStatus('Saved') }
    catch (e) { setStatus(''); setError(e.message) }
  }

  if (error && !doc) return <div className="card"><p className="error">{error}</p><Link to="/">Back</Link></div>
  if (!doc || !editor) return <div className="card">Loading...</div>

  const Btn = ({ label, cmd, active }) => (
    <button className={active ? 'active' : ''} disabled={!canEdit} onClick={cmd}>{label}</button>
  )
  const c = () => editor.chain().focus()

  return (
    <div className="card wide">
      <div className="bar">
        <Link to="/">← Back</Link>
        <input className="title" value={title} disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== doc.title && save({ title })} />
        <span className="muted">{canEdit ? status : 'View only'}</span>
        {doc.access === 'owner' && <button onClick={() => setShareOpen(true)}>Share</button>}
      </div>
      <div className="toolbar">
        <Btn label="B" active={editor.isActive('bold')} cmd={() => c().toggleBold().run()} />
        <Btn label="I" active={editor.isActive('italic')} cmd={() => c().toggleItalic().run()} />
        <Btn label="U" active={editor.isActive('underline')} cmd={() => c().toggleUnderline().run()} />
        <Btn label="H1" active={editor.isActive('heading', { level: 1 })} cmd={() => c().toggleHeading({ level: 1 }).run()} />
        <Btn label="H2" active={editor.isActive('heading', { level: 2 })} cmd={() => c().toggleHeading({ level: 2 }).run()} />
        <Btn label="• List" active={editor.isActive('bulletList')} cmd={() => c().toggleBulletList().run()} />
        <Btn label="1. List" active={editor.isActive('orderedList')} cmd={() => c().toggleOrderedList().run()} />
      </div>
      {error && <p className="error">{error}</p>}
      <EditorContent editor={editor} className="editor" />
      {shareOpen && <ShareDialog id={id} onClose={() => setShareOpen(false)} />}
    </div>
  )
}

function ShareDialog({ id, onClose }) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('edit')
  const [shares, setShares] = useState([])
  const [msg, setMsg] = useState('')
  const load = () => api(`/docs/${id}/shares`).then(setShares).catch(() => {})
  useEffect(() => { load() }, [])

  async function share() {
    try {
      await api(`/docs/${id}/share`, { method: 'POST', body: { email, permission } })
      setMsg('Shared'); setEmail(''); load()
    } catch (e) { setMsg(e.message) }
  }
  return (
    <div className="modal"><div className="card narrow">
      <h2>Share document</h2>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="User email" />
      <select value={permission} onChange={(e) => setPermission(e.target.value)}>
        <option value="edit">Can edit</option><option value="view">Can view</option>
      </select>
      <button onClick={share}>Share</button>
      {msg && <p className="muted">{msg}</p>}
      <ul>{shares.map((s) => <li key={s.email}>{s.email} <span className="muted">{s.permission}</span></li>)}</ul>
      <button onClick={onClose}>Close</button>
    </div></div>
  )
}
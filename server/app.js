const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { marked } = require('marked');
const { User, Document, Share } = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- auth middleware ---
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please log in' });
  }
}

// returns 'owner' | 'edit' | 'view' | null
async function getAccess(userId, doc) {
  if (doc.ownerId === userId) return 'owner';
  const share = await Share.findOne({ where: { DocumentId: doc.id, UserId: userId } });
  return share ? share.permission : null;
}

async function loadDoc(req, res, needEdit = false) {
  const doc = await Document.findByPk(req.params.id, { include: [{ model: User, as: 'owner', attributes: ['name', 'email'] }] });
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return null; }
  const access = await getAccess(req.user.id, doc);
  if (!access) { res.status(403).json({ error: 'No access to this document' }); return null; }
  if (needEdit && access === 'view') { res.status(403).json({ error: 'View-only access' }); return null; }
  return { doc, access };
}

// --- routes ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = email && (await User.findOne({ where: { email } }));
  if (!user || !(await bcrypt.compare(password || '', user.password)))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/docs', auth, async (req, res) => {
  const owned = await Document.findAll({ where: { ownerId: req.user.id }, attributes: ['id', 'title', 'updatedAt'], order: [['updatedAt', 'DESC']] });
  const shares = await Share.findAll({
    where: { UserId: req.user.id },
    include: [{ model: Document, attributes: ['id', 'title', 'updatedAt'], include: [{ model: User, as: 'owner', attributes: ['name'] }] }],
  });
  const shared = shares.map((s) => ({ ...s.Document.toJSON(), permission: s.permission }));
  res.json({ owned, shared });
});

app.post('/api/docs', auth, async (req, res) => {
  const title = (req.body?.title || '').trim().slice(0, 200) || 'Untitled document';
  const doc = await Document.create({ title, ownerId: req.user.id });
  res.status(201).json(doc);
});

app.get('/api/docs/:id', auth, async (req, res) => {
  const r = await loadDoc(req, res);
  if (r) res.json({ ...r.doc.toJSON(), access: r.access });
});

app.put('/api/docs/:id', auth, async (req, res) => {
  const r = await loadDoc(req, res, true);
  if (!r) return;
  const { title, content } = req.body || {};
  if (title !== undefined) {
    if (!String(title).trim()) return res.status(400).json({ error: 'Title cannot be empty' });
    r.doc.title = String(title).trim().slice(0, 200);
  }
  if (content !== undefined) r.doc.content = String(content);
  await r.doc.save();
  res.json({ id: r.doc.id, title: r.doc.title, updatedAt: r.doc.updatedAt });
});

app.post('/api/docs/:id/share', auth, async (req, res) => {
  const r = await loadDoc(req, res);
  if (!r) return;
  if (r.access !== 'owner') return res.status(403).json({ error: 'Only the owner can share' });
  const { email, permission = 'edit' } = req.body || {};
  if (!['view', 'edit'].includes(permission)) return res.status(400).json({ error: 'Invalid permission' });
  const target = email && (await User.findOne({ where: { email: String(email).toLowerCase().trim() } }));
  if (!target) return res.status(404).json({ error: 'No user with that email' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You already own this document' });
  const [share, created] = await Share.findOrCreate({ where: { DocumentId: r.doc.id, UserId: target.id }, defaults: { permission } });
  if (!created) { share.permission = permission; await share.save(); }
  res.json({ shared: true, with: target.email, permission });
});

app.get('/api/docs/:id/shares', auth, async (req, res) => {
  const r = await loadDoc(req, res);
  if (!r) return;
  if (r.access !== 'owner') return res.status(403).json({ error: 'Only the owner can see shares' });
  const shares = await Share.findAll({ where: { DocumentId: r.doc.id }, include: [{ model: User, attributes: ['email', 'name'] }] });
  res.json(shares.map((s) => ({ email: s.User.email, name: s.User.name, permission: s.permission })));
});

// Upload .txt / .md -> new editable document
app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const name = req.file.originalname;
  const ext = name.split('.').pop().toLowerCase();
  if (!['txt', 'md'].includes(ext)) return res.status(400).json({ error: 'Only .txt and .md files are supported' });
  const text = req.file.buffer.toString('utf8');
  const html = ext === 'md'
    ? marked.parse(escapeHtml(text).replace(/&gt;/g, '>')) // keep blockquote syntax working
    : text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
  const doc = await Document.create({ title: name.replace(/\.[^.]+$/, ''), content: html, ownerId: req.user.id });
  res.status(201).json(doc);
});

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 1 MB)' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;
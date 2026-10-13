delete process.env.DATABASE_URL; // tests kabhi asli Postgres ko na chhuen (require se PEHLE)

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('./app');
const { sequelize, User } = require('./db');

jest.setTimeout(60000);

let alice, bob, carol, docId;
const login = async (email) =>
  (await request(app).post('/api/login').send({ email, password: 'password123' })).body.token;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const pw = await bcrypt.hash('password123', 4); // tests ke liye halka
  for (const n of ['alice', 'bob', 'carol']) {
    await User.create({ name: n, email: `${n}@test.com`, password: pw });
  }
  alice = await login('alice@test.com');
  bob = await login('bob@test.com');
  carol = await login('carol@test.com');
  const r = await request(app).post('/api/docs').set(auth(alice)).send({ title: 'Spec' });
  docId = r.body.id;
}, 60000);

afterAll(() => sequelize.close());

test('user without access gets 403', async () => {
  const r = await request(app).get(`/api/docs/${docId}`).set(auth(carol));
  expect(r.status).toBe(403);
});

test('view-only share can read but not edit', async () => {
  await request(app).post(`/api/docs/${docId}/share`).set(auth(alice))
    .send({ email: 'bob@test.com', permission: 'view' });
  const read = await request(app).get(`/api/docs/${docId}`).set(auth(bob));
  expect(read.status).toBe(200);
  expect(read.body.access).toBe('view');
  const write = await request(app).put(`/api/docs/${docId}`).set(auth(bob)).send({ content: '<p>hi</p>' });
  expect(write.status).toBe(403);
});

test('edit share can save changes', async () => {
  await request(app).post(`/api/docs/${docId}/share`).set(auth(alice))
    .send({ email: 'bob@test.com', permission: 'edit' });
  const write = await request(app).put(`/api/docs/${docId}`).set(auth(bob)).send({ content: '<p>hi</p>' });
  expect(write.status).toBe(200);
});

test('only the owner can share', async () => {
  const r = await request(app).post(`/api/docs/${docId}/share`).set(auth(bob))
    .send({ email: 'carol@test.com' });
  expect(r.status).toBe(403);
});

test('upload rejects unsupported file types', async () => {
  const r = await request(app).post('/api/upload').set(auth(alice))
    .attach('file', Buffer.from('x'), 'a.pdf');
  expect(r.status).toBe(400);
});
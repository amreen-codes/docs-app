const app = require('./app');
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('./db');

async function start() {
  await sequelize.sync();
  const seeds = [['Alice', 'alice@test.com'], ['Bob', 'bob@test.com'], ['Carol', 'carol@test.com']];
  for (const [name, email] of seeds) {
    await User.findOrCreate({ where: { email }, defaults: { name, password: await bcrypt.hash('password123', 10) } });
  }
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log('Server on ' + port));
}
start();
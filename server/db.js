const { Sequelize, DataTypes } = require('sequelize');

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.NODE_ENV === 'test' ? ':memory:' : './data.sqlite',
      logging: false,
    });

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
});
const Document = sequelize.define('Document', {
  title: { type: DataTypes.STRING, defaultValue: 'Untitled document' },
  content: { type: DataTypes.TEXT, defaultValue: '' }, // HTML from the editor
});
const Share = sequelize.define('Share', {
  permission: { type: DataTypes.ENUM('view', 'edit'), defaultValue: 'edit' },
});

User.hasMany(Document, { foreignKey: 'ownerId' });
Document.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
Document.hasMany(Share, { foreignKey: 'DocumentId' });
Share.belongsTo(Document, { foreignKey: 'DocumentId' });
User.hasMany(Share, { foreignKey: 'UserId' });
Share.belongsTo(User, { foreignKey: 'UserId' });

module.exports = { sequelize, User, Document, Share };
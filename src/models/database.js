const { Sequelize } = require("sequelize");
const path = require("path");
const defineUser = require("./User");
const defineRecord = require("./Record");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.resolve(process.env.DB_PATH || "./database.sqlite"),
  logging: false,
});

const User = defineUser(sequelize);
const Record = defineRecord(sequelize);

// Associations
Record.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Record, { foreignKey: "user_id", as: "records" });

/**
 * Connect to SQLite and sync all models (creates/alters tables automatically).
 */
async function initDB() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log("✅ Database connected and synced");
}

module.exports = { sequelize, initDB, User, Record };

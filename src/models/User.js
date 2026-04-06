const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM("admin", "analyst", "viewer"),
        defaultValue: "viewer",
        allowNull: false,
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    },
    {
      tableName: "users",
      underscored: true,
    }
  );

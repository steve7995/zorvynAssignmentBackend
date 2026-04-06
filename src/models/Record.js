const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Record",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: false },
      type: {
        type: DataTypes.ENUM("income", "expense"),
        allowNull: false,
      },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      category: { type: DataTypes.STRING, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      description: { type: DataTypes.TEXT, defaultValue: "" },
    },
    {
      tableName: "records",
      underscored: true,
      paranoid: true, // soft delete — adds deleted_at column, Sequelize excludes these rows automatically
    }
  );

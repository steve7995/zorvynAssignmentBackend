const bcrypt = require("bcryptjs");
const { User } = require("./database");

async function seedDefaultAdmin() {
  const count = await User.count();
  if (count === 0) {
    await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: bcrypt.hashSync("admin123", 10),
      role: "admin",
      is_active: true,
    });
    console.log("🌱 Default admin seeded: admin@example.com / admin123");
  }
}

module.exports = { seedDefaultAdmin };

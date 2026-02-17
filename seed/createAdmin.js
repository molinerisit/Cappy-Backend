const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../src/models/user.model");

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cooklevel");

async function createAdmin() {
  const existing = await User.findOne({ email: "admin@cooklevel.com" });
  if (existing) {
    console.log("Admin ya existe");
    process.exit();
  }

  const hashedPassword = await bcrypt.hash("Admin123!", 10);

  await User.create({
    name: "Admin",
    email: "admin@cooklevel.com",
    password: hashedPassword,
    role: "admin"
  });

  console.log("Admin creado correctamente");
  process.exit();
}

createAdmin();

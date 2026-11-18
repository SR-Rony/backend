import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../modules/users/user.model";

(async () => {
  const { ADMIN_NAME = "Super Admin", ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
  await connectDB();
  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL.toLowerCase() },
    { name: ADMIN_NAME, password, role: "admin" },
    { upsert: true, setDefaultsOnInsert: true }
  );
  console.log(`Admin ready: ${ADMIN_EMAIL}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });

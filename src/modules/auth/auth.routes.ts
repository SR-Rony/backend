import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env";
import { User, UserDoc } from "../users/user.model";
import { authenticate } from "../../middlewares/auth";
import { AppError, asyncHandler, ok } from "../../utils/http";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
}); // unknown keys (e.g. "role") are stripped by zod => nobody can self-assign admin

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

const sign = (u: UserDoc) =>
  jwt.sign({ role: u.role }, env.jwtSecret, { subject: u.id, expiresIn: env.jwtExpiresIn as any, algorithm: "HS256" });

router.post("/register", asyncHandler(async (req, res) => {
  const d = registerSchema.parse(req.body);
  if (await User.exists({ email: d.email })) throw new AppError(409, "Email already registered");
  const user = await User.create({ ...d, password: await bcrypt.hash(d.password, 12), role: "user" });
  ok(res, { token: sign(user), user }, "Registered", 201);
}));

router.post("/login", asyncHandler(async (req, res) => {
  const d = loginSchema.parse(req.body);
  const user = await User.findOne({ email: d.email }).select("+password");
  const valid = user ? await bcrypt.compare(d.password, user.password) : false;
  if (!user || !valid) throw new AppError(401, "Invalid email or password");
  ok(res, { token: sign(user), user }, "Logged in");
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => ok(res, req.user)));

export default router;

import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "./user.model";
import { Note } from "../notes/note.model";
import { Post } from "../posts/post.model";
import { authenticate, authorize } from "../../middlewares/auth";
import { AppError, asyncHandler, ok, objectId, paginated, parsePagination } from "../../utils/http";

const router = Router();
router.use(authenticate, authorize("admin")); // every /api/admin/* route is admin-only

const base = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["user", "admin"]),
  interests: z.array(z.string().trim().min(1).max(50)).max(20),
});
const createSchema = base.partial({ role: true, interests: true });
const updateSchema = base.partial().refine((v) => Object.keys(v).length > 0, "Nothing to update");

router.post("/users", asyncHandler(async (req, res) => {
  const d = createSchema.parse(req.body);
  if (await User.exists({ email: d.email })) throw new AppError(409, "Email already registered");
  const user = await User.create({ ...d, role: d.role ?? "user", password: await bcrypt.hash(d.password, 12) });
  ok(res, user, "User created", 201);
}));

router.get("/users", asyncHandler(async (req, res) => {
  const p = parsePagination(req.query);
  const [data, total] = await Promise.all([
    User.find().sort({ _id: -1 }).skip(p.skip).limit(p.limit),
    User.estimatedDocumentCount(),
  ]);
  paginated(res, data, total, p);
}));

router.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(objectId(req.params.id));
  if (!user) throw new AppError(404, "User not found");
  ok(res, user);
}));

router.patch("/users/:id", asyncHandler(async (req, res) => {
  const id = objectId(req.params.id);
  const { password, ...rest } = updateSchema.parse(req.body);
  if (id === req.user!.id && rest.role && rest.role !== req.user!.role)
    throw new AppError(400, "You cannot change your own role");
  const user = await User.findById(id);
  if (!user) throw new AppError(404, "User not found");
  if (rest.email && rest.email !== user.email && (await User.exists({ email: rest.email })))
    throw new AppError(409, "Email already registered");
  Object.assign(user, rest);
  if (password) user.password = await bcrypt.hash(password, 12);
  await user.save();
  ok(res, user, "User updated");
}));

// deleting a user also deletes their notes and posts
router.delete("/users/:id", asyncHandler(async (req, res) => {
  const id = objectId(req.params.id);
  if (id === req.user!.id) throw new AppError(400, "You cannot delete yourself");
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new AppError(404, "User not found");
  await Promise.all([Note.deleteMany({ userId: id }), Post.deleteMany({ userId: id })]);
  ok(res, null, "User deleted");
}));

export default router;

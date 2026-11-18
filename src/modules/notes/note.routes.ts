import { Router } from "express";
import { z } from "zod";
import { Note } from "./note.model";
import { authenticate } from "../../middlewares/auth";
import { AppError, asyncHandler, ok, objectId, paginated, parsePagination } from "../../utils/http";

const router = Router();
router.use(authenticate);

const createSchema = z.object({ title: z.string().trim().min(1).max(200), content: z.string().max(10000).default("") });
const updateSchema = createSchema.partial().refine((v) => Object.keys(v).length > 0, "Nothing to update");

// POST /api/notes  (userId always comes from the token)
router.post("/", asyncHandler(async (req, res) => {
  const d = createSchema.parse(req.body);
  ok(res, await Note.create({ ...d, userId: req.user!._id }), "Note created", 201);
}));

// GET /api/notes            -> my notes
// GET /api/notes?scope=all  -> ADMIN only: everyone's notes (optional ?userId=)
router.get("/", asyncHandler(async (req, res) => {
  const p = parsePagination(req.query);
  const admin = req.user!.role === "admin";
  let filter: Record<string, any> = { userId: req.user!._id };
  let all = false;
  if (req.query.scope === "all") {
    if (!admin) throw new AppError(403, "Forbidden");
    all = true;
    filter = typeof req.query.userId === "string" ? { userId: objectId(req.query.userId) } : {};
  }
  let q = Note.find(filter).sort({ _id: -1 }).skip(p.skip).limit(p.limit);
  if (all) q = q.populate("userId", "name email");
  const [data, total] = await Promise.all([q, Note.countDocuments(filter)]);
  paginated(res, data, total, p);
}));

// GET one: owner only (admin may read any)
router.get("/:id", asyncHandler(async (req, res) => {
  const filter: Record<string, any> = { _id: objectId(req.params.id) };
  if (req.user!.role !== "admin") filter.userId = req.user!._id;
  const note = await Note.findOne(filter);
  if (!note) throw new AppError(404, "Note not found");
  ok(res, note);
}));

// PATCH / DELETE: owner only. Someone else's note => 404 (does not leak existence)
router.patch("/:id", asyncHandler(async (req, res) => {
  const d = updateSchema.parse(req.body);
  const note = await Note.findOneAndUpdate({ _id: objectId(req.params.id), userId: req.user!._id }, d, { new: true, runValidators: true });
  if (!note) throw new AppError(404, "Note not found");
  ok(res, note, "Note updated");
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: objectId(req.params.id), userId: req.user!._id });
  if (!note) throw new AppError(404, "Note not found");
  ok(res, null, "Note deleted");
}));

export default router;

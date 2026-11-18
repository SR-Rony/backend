import { Router } from "express";
import { z } from "zod";
import { Post } from "./post.model";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler, ok, paginated, parsePagination } from "../../utils/http";

const router = Router();
router.use(authenticate);

const schema = z.object({ title: z.string().trim().min(1).max(200), content: z.string().max(10000).default("") });

router.post("/", asyncHandler(async (req, res) => {
  ok(res, await Post.create({ ...schema.parse(req.body), userId: req.user!._id }), "Post created", 201);
}));

// posts are visible to every logged-in user
router.get("/", asyncHandler(async (req, res) => {
  const p = parsePagination(req.query);
  const [data, total] = await Promise.all([
    Post.find().sort({ _id: -1 }).skip(p.skip).limit(p.limit).populate("userId", "name"),
    Post.estimatedDocumentCount(),
  ]);
  paginated(res, data, total, p);
}));

export default router;

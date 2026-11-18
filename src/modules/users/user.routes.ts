import { Router } from "express";
import { Types } from "mongoose";
import { User } from "./user.model";
import { authenticate } from "../../middlewares/auth";
import { AppError, asyncHandler, objectId, paginated, paginationMeta, parsePagination } from "../../utils/http";

const router = Router();
router.use(authenticate);

/**
 * SCENARIO 1 - users grouped by interests. EXACTLY ONE User.aggregate() call.
 * GET /api/users/interests?interest=chess&page=1&limit=10
 * With ?interest the first $match uses the { interests: 1 } index.
 * Pagination + total count are done inside the same pipeline with $facet.
 */
router.get("/interests", asyncHandler(async (req, res) => {
  const p = parsePagination(req.query);
  const interest = typeof req.query.interest === "string" ? req.query.interest.trim().toLowerCase() : "";
  const match = interest ? [{ $match: { interests: interest } }] : [];
  const [r] = await User.aggregate([
    ...match,                                   // index-supported filter (optional)
    { $unwind: "$interests" },
    ...match,                                   // keep only the requested group after unwinding
    { $group: { _id: "$interests", users: { $push: "$name" } } },
    { $sort: { _id: 1 } },
    { $facet: { data: [{ $skip: p.skip }, { $limit: p.limit }], total: [{ $count: "n" }] } },
  ]);
  paginated(res, r.data, r.total[0]?.n ?? 0, p);
}));

/**
 * SCENARIO 2 - all posts of one user: ONE pipeline with $lookup.
 * foreignField posts.userId is served by the posts { userId: 1, _id: -1 } index.
 * (localField/foreignField + pipeline needs MongoDB 5.0+; Atlas is newer.)
 */
router.get("/:id/posts", asyncHandler(async (req, res) => {
  const p = parsePagination(req.query);
  const id = new Types.ObjectId(objectId(req.params.id));
  const [u] = await User.aggregate([
    { $match: { _id: id } },
    { $lookup: { from: "posts", localField: "_id", foreignField: "userId", as: "posts",
        pipeline: [{ $sort: { _id: -1 } }, { $skip: p.skip }, { $limit: p.limit }] } },
    { $lookup: { from: "posts", localField: "_id", foreignField: "userId", as: "count",
        pipeline: [{ $count: "n" }] } },
    { $project: { name: 1, posts: 1, total: { $ifNull: [{ $arrayElemAt: ["$count.n", 0] }, 0] } } },
  ]);
  if (!u) throw new AppError(404, "User not found");
  res.json({ success: true, data: { user: { _id: u._id, name: u.name }, posts: u.posts }, pagination: paginationMeta(u.total, p) });
}));

export default router;

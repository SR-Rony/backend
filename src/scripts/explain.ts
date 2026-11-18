import "dotenv/config";
import mongoose, { Types } from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../modules/users/user.model";
import { Note } from "../modules/notes/note.model";
import { Post } from "../modules/posts/post.model";

const report = (label: string, plan: any) => {
  const s = JSON.stringify(plan);
  const scan = s.includes("COLLSCAN") ? "COLLSCAN" : s.includes("IXSCAN") ? "IXSCAN" : "?";
  const num = (k: string) => s.match(new RegExp(`"${k}":(\\d+)`))?.[1];
  const idx = s.match(/"indexName":"([^"]+)"/)?.[1] ?? "-";
  console.log(`${label.padEnd(38)} ${scan.padEnd(9)} index=${idx.padEnd(18)} returned=${num("nReturned")} docsExamined=${num("totalDocsExamined")} keysExamined=${num("totalKeysExamined")}`);
};

(async () => {
  await connectDB();
  const user = await User.findOne({ email: "john@demo.com" });
  if (!user) throw new Error("Run `npm run seed:demo` first");
  const uid: Types.ObjectId = user._id;
  const x = "executionStats" as const;

  report("login (email)", await User.findOne({ email: "john@demo.com" }).explain(x));
  report("get user by id", await User.findById(uid).explain(x));
  report("users list (admin)", await User.find().sort({ _id: -1 }).limit(10).explain(x));
  report("my notes", await Note.find({ userId: uid }).sort({ _id: -1 }).limit(10).explain(x));
  report("admin all notes", await Note.find().sort({ _id: -1 }).limit(10).explain(x));
  report("admin notes of one user", await Note.find({ userId: uid }).sort({ _id: -1 }).limit(10).explain(x));
  report("posts of user (lookup foreign side)", await Post.find({ userId: uid }).sort({ _id: -1 }).limit(10).explain(x));
  report("scenario 1 (no filter)", await User.aggregate([{ $unwind: "$interests" }, { $group: { _id: "$interests", users: { $push: "$name" } } }, { $sort: { _id: 1 } }]).explain(x));
  report("scenario 1 (?interest=chess)", await User.aggregate([{ $match: { interests: "chess" } }, { $unwind: "$interests" }, { $match: { interests: "chess" } }, { $group: { _id: "$interests", users: { $push: "$name" } } }]).explain(x));
  report("scenario 2 ($match on _id)", await User.aggregate([{ $match: { _id: uid } }, { $lookup: { from: "posts", localField: "_id", foreignField: "userId", as: "posts" } }]).explain(x));

  for (const m of [User, Note, Post]) console.log(m.collection.name, (await m.collection.indexes()).map((i) => i.name).join(", "));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

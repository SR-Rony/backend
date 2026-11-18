import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../modules/users/user.model";
import { Note } from "../modules/notes/note.model";
import { Post } from "../modules/posts/post.model";

const people: [string, string[]][] = [
  ["John", ["chess", "reading"]], ["Alex", ["chess", "coding"]], ["Sarah", ["reading", "travel"]],
  ["Maria", ["coding", "music"]], ["Omar", ["football", "chess"]], ["Lina", ["music", "travel", "reading"]],
  ["Rahim", ["football", "coding"]], ["Nusrat", ["painting", "reading"]], ["Tom", ["travel", "football"]],
  ["Ayesha", ["painting", "music", "chess"]], ["Kabir", []],
];

(async () => {
  await connectDB();
  const old = await User.find({ email: /@demo\.com$/ }, "_id");
  const ids = old.map((u) => u._id);
  await Promise.all([Note.deleteMany({ userId: { $in: ids } }), Post.deleteMany({ userId: { $in: ids } }), User.deleteMany({ _id: { $in: ids } })]);

  const password = await bcrypt.hash("Password123!", 12);
  const users = await User.insertMany(
    people.map(([name, interests]) => ({ name, email: `${name.toLowerCase()}@demo.com`, password, interests, role: "user" }))
  );
  const notes = users.flatMap((u) => [1, 2, 3].map((i) => ({ userId: u._id, title: `${u.name} note ${i}`, content: `Private note ${i} of ${u.name}` })));
  const posts = users.flatMap((u, k) => Array.from({ length: (k % 3) + 1 }, (_, i) => ({ userId: u._id, title: `${u.name} post ${i + 1}`, content: "Public post content" })));
  await Note.insertMany(notes);
  await Post.insertMany(posts);
  console.log(`Seeded ${users.length} users, ${notes.length} notes, ${posts.length} posts. Login: john@demo.com / Password123!`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

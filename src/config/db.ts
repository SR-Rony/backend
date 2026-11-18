import mongoose from "mongoose";
import { env } from "./env";
import { User } from "../modules/users/user.model";
import { Note } from "../modules/notes/note.model";
import { Post } from "../modules/posts/post.model";

export async function connectDB() {
  await mongoose.connect(env.mongoUri);
  // make sure the schema.index() definitions are built
  await Promise.all([User.init(), Note.init(), Post.init()]);
  console.log("MongoDB connected");
}

import { Schema, model } from "mongoose";

const postSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: "", maxlength: 10000 },
  },
  { timestamps: true, toJSON: { transform: (_d, r: any) => { delete r.__v; return r; } } }
);

// Scenario 2: foreignField of the $lookup (+ newest-first ordering inside the lookup)
postSchema.index({ userId: 1, _id: -1 });

export const Post = model("Post", postSchema);

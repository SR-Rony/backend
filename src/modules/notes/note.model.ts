import { Schema, model } from "mongoose";

const noteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: "", maxlength: 10000 },
  },
  { timestamps: true, toJSON: { transform: (_d, r: any) => { delete r.__v; return r; } } }
);

// "my notes" list (newest first) + admin filter by user. ObjectId is time-ordered, so _id sort == newest first.
noteSchema.index({ userId: 1, _id: -1 });

export const Note = model("Note", noteSchema);

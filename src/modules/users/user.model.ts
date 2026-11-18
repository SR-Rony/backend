import { Schema, model, HydratedDocument } from "mongoose";

export type Role = "user" | "admin";
export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  interests: string[];
}
export type UserDoc = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    interests: { type: [{ type: String, trim: true, lowercase: true }], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// login + duplicate-email check (unique constraint)
userSchema.index({ email: 1 }, { unique: true });
// Scenario 1: `$match: { interests }` before `$unwind` (interest filter)
userSchema.index({ interests: 1 });

export const User = model<IUser>("User", userSchema);

import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import authRoutes from "./modules/auth/auth.routes";
import noteRoutes from "./modules/notes/note.routes";
import postRoutes from "./modules/posts/post.routes";
import userRoutes from "./modules/users/user.routes";
import adminRoutes from "./modules/users/admin.routes";
import { errorHandler, notFound } from "./middlewares/error";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => res.json({ success: true, status: "ok" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;

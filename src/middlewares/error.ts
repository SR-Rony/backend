import { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/http";

export const notFound: RequestHandler = (_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" });

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError)
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  if (err instanceof AppError) return res.status(err.status).json({ success: false, message: err.message });
  if (err?.code === 11000) return res.status(409).json({ success: false, message: "Duplicate value (email already exists)" });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ success: false, message: "Invalid JSON" });
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
};

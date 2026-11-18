import jwt from "jsonwebtoken";
import { RequestHandler } from "express";
import { env } from "../config/env";
import { User, Role } from "../modules/users/user.model";
import { AppError, asyncHandler } from "../utils/http";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) throw new AppError(401, "Authentication required");
  let payload: any;
  try {
    payload = jwt.verify(h.slice(7), env.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
  const user = await User.findById(payload.sub); // role always comes from DB, not from the token
  if (!user) throw new AppError(401, "User no longer exists");
  req.user = user;
  next();
});

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, "Forbidden"));
    next();
  };

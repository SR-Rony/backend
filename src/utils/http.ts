import { RequestHandler, Response } from "express";

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: any, res: Response, next: any) => Promise<any>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const ok = (res: Response, data: unknown, message?: string, status = 200) =>
  res.status(status).json({ success: true, data, message });

export const parsePagination = (q: Record<string, any>) => {
  const page = Math.max(parseInt(q.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const paginationMeta = (total: number, p: { page: number; limit: number }) => ({
  currentPage: p.page,
  limit: p.limit,
  totalItems: total,
  totalPages: Math.ceil(total / p.limit),
});

export const paginated = (res: Response, data: unknown, total: number, p: { page: number; limit: number }) =>
  res.json({ success: true, data, pagination: paginationMeta(total, p) });

export const objectId = (id: string) => {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) throw new AppError(400, "Invalid id");
  return id;
};

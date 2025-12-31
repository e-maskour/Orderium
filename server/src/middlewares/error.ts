import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, "Route not found"));
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status ?? 500;

  if (status >= 500) logger.error({ err }, "Unhandled error");

  res.status(status).json({
    message: err?.message ?? "Internal server error",
    ...(err?.details ? { details: err.details } : {}),
  });
}

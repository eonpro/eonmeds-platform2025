import { Request, Response, NextFunction } from "express";

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  err: ErrorWithStatus,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error("Error:", err);

  // Default error
  let status = err.status || 500;
  let message = err.message || "Internal Server Error";

  // Handle specific error types
  if (err.code === "23505") {
    // PostgreSQL unique violation
    status = 409;
    message = "Resource already exists";
  } else if (err.code === "23503") {
    // PostgreSQL foreign key violation
    status = 400;
    message = "Invalid reference";
  } else if (err.code === "22P02") {
    // PostgreSQL invalid text representation
    status = 400;
    message = "Invalid data format";
  } else if (err.name === "ValidationError") {
    status = 400;
  } else if (err.name === "UnauthorizedError") {
    status = 401;
    message = "Unauthorized";
  }

  res.status(status).json({
    error: err.name || "Error",
    message,
<<<<<<< HEAD
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
=======
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  });
};

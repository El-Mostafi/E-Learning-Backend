import { NextFunction, Request, Response } from "express";
import { NotAutherizedError } from "../errors/not-autherized-error";

export const roleIsInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser || req.currentUser!.role !== "instructor") {
    return next(new NotAutherizedError());
  }
  next();
};
export const roleIsInstructorOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (
    !req.currentUser ||
    (req.currentUser.role !== "instructor" && req.currentUser.role !== "admin")
  ) {
    return next(new NotAutherizedError());
  }
  next();
};

export const roleIsStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser || req.currentUser.role !== "student") {
    return next(new NotAutherizedError());
  }
  next();
};

export const roleIsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser || req.currentUser.role !== "admin") {
    return next(new NotAutherizedError());
  }
  next();
};

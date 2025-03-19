import { Request, Response, NextFunction } from "express";
import { NotAutherizedError } from "../../../common";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // res.status(401).send({ message: "Unauthorized" });
    return next(new NotAutherizedError());
  }
  next();
};

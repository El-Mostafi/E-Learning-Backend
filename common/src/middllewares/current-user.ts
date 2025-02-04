import e, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticationService } from "../services/authentication";
import { BadRequestError } from "../errors/bad-request-error";
import mongoose from "mongoose";
declare global {
  interface JwtPayload {
    email: string;
    userId: mongoose.Types.ObjectId;
    userName: string;
    emailConfirmed: boolean;
  }
  namespace Express {
    interface Request {
      currentUser?: JwtPayload;
    }
  }
}
export const currentUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.session?.jwt == null) {
    return next();
  }
  try {
    const payload = authenticationService.verifyJwt(
      req.session?.jwt,
      process.env.JWT_KEY!
    );
    req.currentUser = payload;
  } catch (err) {
    return next(err);
  }
  next();
};

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticationService } from "../services/authentication";
import { NotAutherizedError } from "../errors/not-autherized-error";
import { UserRole } from "../../../src/models/user";
import mongoose from "mongoose";

declare global {
  interface JwtPayload {
    email: string;
    userId: mongoose.Types.ObjectId;
    userName: string;
    emailConfirmed: boolean;
    profileImg: string;
    role: UserRole;
    status: "active" | "blocked";
    lastLogin: Date|null;
    expertise?: string;
    yearsOfExperience?: number;
    biography?: String;
    educationLevel?: string;
    fieldOfStudy?: string;
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
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Not signed in, just proceed without setting currentUser
    return next();
  }

  try {
    const token = authHeader.split(" ")[1]; // Extract token after "Bearer "
    const payload = authenticationService.verifyJwt(
      token,
      process.env.JWT_KEY!
    );
    req.currentUser = payload;
  } catch (err) {
    // Invalid token, proceed without setting currentUser
  }
  next();
};

import { Request, Response, NextFunction } from "express";
import { NotAutherizedError } from "../../../common";
import { authenticationService } from "../services/authentication";

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
  try {
    const token = authHeader.split(" ")[1]; // Extract token after "Bearer "
    const payload = await authenticationService.verifyJwt(
      token,
      process.env.JWT_KEY!
    );
  } catch (err) {
    return next(new NotAutherizedError());
  }
  next();
};

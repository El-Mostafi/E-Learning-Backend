import { Request, Response, NextFunction } from "express";
import jwt  from "jsonwebtoken";
import { authenticationService } from "../services/authentication";
import { BadRequestError } from "../errors/bad-request-error";
declare global {
    interface JwtPayload {
        email: string;
        userId: string;
        userName: string;
        emailConfirmed: boolean;
    }
    namespace Express {
        interface Request {
            currentUser?:JwtPayload;
        }
    }
}
export const currentUser =(req: Request, res: Response, next: NextFunction)=>{
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).send({ message: "Unauthorized" });
        return;
    }

    try {
        const token = authHeader.split(" ")[1]; // Extract token after "Bearer "
        const payload = authenticationService.verifyJwt(token, process.env.JWT_KEY!);
        req.currentUser = payload;
        next();
    } catch (err) {
        res.status(401).send({ message: "Invalid token" });
        return;
    }
}
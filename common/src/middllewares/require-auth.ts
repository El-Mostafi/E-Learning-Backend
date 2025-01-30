import { Request, Response, NextFunction } from "express";
import { NotAutherizedError } from "../../../common";

export const requireAuth= async (req: Request, res: Response, next: NextFunction) => {
    if(!req.currentUser || req.currentUser.emailConfirmed == false){
        return next(new NotAutherizedError());
    }
    next();
}
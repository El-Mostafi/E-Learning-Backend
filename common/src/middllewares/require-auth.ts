import { Request, Response, NextFunction } from "express";
import { NotAutherizedError } from "../../../common";

export const requireAuth= async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.currentUser);
    if(!req.currentUser){
        return next(new NotAutherizedError());
    }
    next();
}
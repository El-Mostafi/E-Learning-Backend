import {Router, Request, Response, NextFunction} from 'express';
import Jwt  from "jsonwebtoken";
import User from "../../models/user";

const router = Router();

router.post('/signout', (req: Request, res: Response, next: NextFunction) => {
    req.session = null;
    res.status(201).send({message: 'User signed out successfully'}); 
});

export {router as signOutRouter} 

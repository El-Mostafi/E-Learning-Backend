import { Router, Request, Response, NextFunction } from "express";
import User from "../../models/user";
import {authenticationService, BadRequestError, ValidationRequest } from "../../../common";
import {body} from 'express-validator';
import Jwt  from "jsonwebtoken";
const router = Router();

router.post('/signin',
    [
        body('email')
        .not().isEmpty()
        .isEmail()
        .withMessage('Please enter a valid email'),
        body('password')
        .not().isEmpty()
        .isLength({min: 8, max: 20})
        .withMessage('Password must be between 8 and 20 characters')
    ],ValidationRequest ,async (req: Request, res: Response, next: NextFunction) => {
    const {email, password} = req.body;
    if(req.session?.jwt != null ){
        return next(new BadRequestError('Already signed in'));
    }
    
    const user = await User.findOne({email});

    if(!user) return next(new BadRequestError('Wrong email or password'));

    const isEqual =await authenticationService.pwdCompare(user.password, password);
    if(isEqual){
        const token = Jwt.sign({email, userId: user._id}, process.env.JWT_KEY!, { expiresIn: '10h' });
            req.session = {jwt : token}
            res.status(201).send({message: 'User signed in successfully', user: user});
        }
    else{
        return next(new BadRequestError('Wrong email or password'));
    }
});

export {router as signInRouter} 
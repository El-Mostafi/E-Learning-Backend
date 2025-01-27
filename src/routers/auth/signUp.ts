import { Router, Request, Response, NextFunction } from "express";
import Jwt  from "jsonwebtoken";
import User from "../../models/user";
import { BadRequestError, ValidationRequest } from "../../../common";
import {body} from 'express-validator';

const router = Router();

router.post('/signup',
    [
        body('email').isEmail().withMessage('Please enter a valid email'),
        body('password')
            .isLength({ min: 8, max: 20 })
            .withMessage('Password must be between 8 and 20 characters'),
    ],
ValidationRequest,
async (req: Request, res: Response, next: NextFunction) => {
    if(req.session?.jwt != null){
        return next(new BadRequestError('Already signed in'));
    }
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if(user) return next(new BadRequestError('User already exists')) ;
    const newUser = await User.build({
        email,
        password
    });
    await newUser.save();
    req.session ={
        jwt: Jwt.sign({email, userId: newUser._id}, process.env.JWT_KEY!, { expiresIn: '10h' })
    }
    res.status(201).send({message: 'User created successfully', user: newUser});
});

export {router as signUpRouter} 
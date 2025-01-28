import { Router, Request, Response, NextFunction } from 'express'
import { authService } from './auth.service';
import { currentUser, BadRequestError,ValidationRequest } from '../../../common'
import {body} from 'express-validator';
const router = Router();

router.post('/signup',
    [
        body('email').isEmail().withMessage('Please enter a valid email'),
        body('password')
            .isLength({ min: 8, max: 20 })
            .withMessage('Password must be between 8 and 20 characters'),
        body('userName').not().isEmpty().withMessage('Please enter a user name'),
    ],
ValidationRequest,
async (req: Request, res: Response, next: NextFunction) => {
    if(req.session?.jwt != null){
        return next(new BadRequestError('Already signed in'));
    }
    const {email, password, userName} = req.body;
    const result = await authService.signup({ email, password, userName });
    if(result.message) return next(new BadRequestError(result.message));

    
    req.session ={
        jwt: result.jwt
    }
    res.status(201).send({message: 'User created successfully', user: result.newUser});
});

router.post('/signin',
    [
        body('email')
        .not().isEmpty()
        .withMessage('Please enter an email or username'),
        body('password')
        .not().isEmpty()
        .isLength({min: 8, max: 20})
        .withMessage('Password must be between 8 and 20 characters')
    ],ValidationRequest ,async (req: Request, res: Response, next: NextFunction) => {
    const {email, password} = req.body;
    if(req.session?.jwt != null ){
        return next(new BadRequestError('Already signed in'));
    }
    const result = await authService.signin({ email, password,userName:email });

    if(result.message) return next(new BadRequestError(result.message))

    req.session = { jwt: result.jwt };

    res.status(201).send({message: 'User signed in successfully', user: result.user});
    
    
});
router.post('/signout', (req: Request, res: Response, next: NextFunction) => {
    req.session = null;
    res.status(201).send({message: 'User signed out successfully'}); 
});
router.get('/current-user',currentUser, (req: Request, res: Response, next: NextFunction) => {
    res.status(200).send({currentUser: req.currentUser});
}); 
export { router as authRouters }
import { Router, Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import {
  currentUser,
  BadRequestError,
  ValidationRequest,
} from "../../../common";
import { body } from "express-validator";
const router = Router();

router.post(
  "/signup",
  [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isLength({ min: 8, max: 20 })
      .withMessage("Password must be between 8 and 20 characters"),
    body("userName").not().isEmpty().withMessage("Please enter a user name"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.session?.jwt != null) {
      return next(new BadRequestError("Already signed in"));
    }
    const { email, password, userName } = req.body;
    const result = await authService.signup({ email, password, userName });
    if (result.message) return next(new BadRequestError(result.message));

    req.session = {
      jwt: result.jwt,
    };
    try {
      await authService.sendOtpVerificationEmail(email, userName);
      res.status(201).send({ message: "Verification email sent" });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/signin",
  [
    body("email")
      .not()
      .isEmpty()
      .withMessage("Please enter an email or username"),
    body("password")
      .not()
      .isEmpty()
      .isLength({ min: 8, max: 20 })
      .withMessage("Password must be between 8 and 20 characters"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const result = await authService.signin({
      email,
      password,
      userName: email,
    });

    if (result.message) return next(new BadRequestError(result.message));

    req.session = { jwt: result.jwt };

    res
      .status(201)
      .send({ message: "User signed in successfully", user: result.user });
  }
);
router.post("/signout", (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session || !req.session.jwt) {
      res.status(400).json({ message: "User is already signed out" });
      return;
    }

    req.session = null;

    res.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({ message: "User signed out successfully" });
  } catch (error) {
    return next(error);
  }
});
router.get(
  "/current-user",
  currentUser,
  (req: Request, res: Response, next: NextFunction) => {
    res.status(200).send({ currentUser: req.currentUser });
  }
);

router.post(
  "/verify-email",
  [body("otp").not().isEmpty().withMessage("Please enter an OTP")],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { otp } = req.body;
    if (req.currentUser == null)
      return next(
        new BadRequestError(
          "Registration not completed yet. Please sign up or login"
        )
      );
    const email = req.currentUser!.email;
    const result = await authService.verifyEmail(email, otp);

    if (result.message) return next(new BadRequestError(result.message));

    const userResult = await authService.verifyUser(
      email,
      req.currentUser!.userName
    );

    if (userResult.message)
      return next(new BadRequestError(userResult.message));

    req.session = {
      jwt: userResult.jwt,
    };
    res.status(200).json({ message: result.success, user: userResult.user });
  }
);
router.post(
  "/resendEmail",
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.currentUser == null)
      return next(
        new BadRequestError(
          "Registration not completed yet. Please sign up or login"
        )
      );
    const email = req.currentUser!.email;
    const userName = req.currentUser!.userName;
    await authService.sendOtpVerificationEmail(email, userName);
    res.status(201).send({ message: "Verification email sent" });
  }
);
router.post(
  "/request-reset-password",
  [
    body("email")
      .isEmail()
      .not()
      .isEmpty()
      .withMessage("Please enter an email"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const result = await authService.RequestResetEmail(email);

    if (result.message) return next(new BadRequestError(result.message));

    res.status(200).json({ message: result.success });
  }
);

router.post(
  "/reset-password",
  [
    body("email").not().isEmpty().withMessage("Please enter an email"),
    body("otp").not().isEmpty().withMessage("Please enter the OTP"),
    body("newPassword")
      .not()
      .isEmpty()
      .isLength({ min: 8, max: 20 })
      .withMessage("Password must be between 8 and 20 characters"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp, newPassword } = req.body;

    const result = await authService.ResetPassword(email, otp, newPassword);

    if (!result.success) return next(new BadRequestError(result.message));

    res.status(200).json({ message: result.message });
  }
);

export { router as authRouters };

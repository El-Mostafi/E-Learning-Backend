import { Router, Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import {
  currentUser,
  BadRequestError,
  ValidationRequest,
  requireAuth,
} from "../../../common";
import { body } from "express-validator";
import UserOTPVerification from "../../models/userOTPVerification";

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
    const { email, password, userName } = req.body;
    const result = await authService.signup({
      email,
      password,
      RememberMe: false,
      userName,
    });
    if (result.message) return next(new BadRequestError(result.message));

    try {
      await authService.sendOtpVerificationEmail(email);
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
    const { email, password, RememberMe } = req.body;
    const result = await authService.signin({
      email,
      password,
      RememberMe: RememberMe ?? false,
      userName: email,
    });

    if (result.message) return next(new BadRequestError(result.message));

    req.session = { jwt: result.jwt };

    res
      .status(201)
      .send({
        jwt: result.jwt,
        message: "User signed in successfully",
        user: result.user,
      });
  }
);
router.post("/signout",requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {

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
  requireAuth,
  currentUser,
  (req: Request, res: Response, next: NextFunction) => {
    res.status(200).send({ currentUser: req.currentUser });
  }
);

router.post(
  "/verify-email",
  [body("email").isEmail().withMessage("Please enter a valid email")],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const userResult = await authService.verifyUser(email, email);

    if (userResult.message)
      return next(new BadRequestError(userResult.message));

    res
      .status(200)
      .json({
        jwt: userResult.jwt,
        message: "OTP verified successfully",
        user: userResult.user,
      });
  }
);
router.post(
  "/resendEmail",
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, Source } = req.body;

    if (email == null || Source == null)
      return next(
        new BadRequestError(
          "Registration not completed yet. Please sign up or login"
        )
      );
    // const email=req.currentUser!.email;
    // const userName=req.currentUser!.userName;
    // Delete the OTP record after successful verification
    await UserOTPVerification.deleteMany({ email });
    if (Source == "Verification") {
      await authService.sendOtpVerificationEmail(email);
    } else if (Source == "ResetPassword") {
      await authService.RequestResetEmail(email);
    } else {
      return next(new BadRequestError("Invalid Source"));
    }
    res.status(201).send({ message: "Code sent successfully" });
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
    // Delete the OTP record after successful verification
    await UserOTPVerification.deleteMany({ email });
    const result = await authService.RequestResetEmail(email);

    if (result.message) return next(new BadRequestError(result.message));

    res.status(200).json({ message: result.success });
  }
);

router.put(
  "/reset-password",
  [
    body("email")
      .not()
      .isEmpty()
      .isEmail()
      .withMessage("Please enter an email"),
    body("newPassword")
      .not()
      .isEmpty()
      .isLength({ min: 8, max: 20 })
      .withMessage("Password must be between 8 and 20 characters"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, newPassword } = req.body;

    const result = await authService.ResetPassword(email, newPassword);

    if (!result.success) return next(new BadRequestError(result.message));

    res.status(200).json({ message: result.message });
  }
);
router.post(
  "/verify-Otp",
  [
    body("email")
      .not()
      .isEmpty()
      .isEmail()
      .withMessage("Please enter an email"),
    body("otp").not().isEmpty().withMessage("Please enter the OTP"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp } = req.body;

    const result = await authService.verifyOtp(email, otp);

    if (result.message) return next(new BadRequestError(result.message));

    res.status(200).json({ message: result.success });
  }
);
router.put(
  "/update-user",
  requireAuth,
  currentUser,
  [
    body("userName")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Username cannot be empty")
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3-20 characters"),
    body("profileImg")
      .optional()
      .isURL()
      .withMessage("Profile image must be a valid URL"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { userName, profileImg } = req.body;
    const userId = req.currentUser!.userId;

    const result = await authService.updateUser(userId, userName, profileImg);

    if (!result.success) return next(new BadRequestError(result.message));

    res.status(200).json({ message: result.message, jwt: result.jwt });
  }
);
export { router as authRouters };

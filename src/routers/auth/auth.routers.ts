import { Router, Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import {
  currentUser,
  BadRequestError,
  ValidationRequest,
  requireAuth,
  deleteImageInCloud,
} from "../../../common";
import { body } from "express-validator";
import UserOTPVerification from "../../models/userOTPVerification";
import { updateData } from "./dtos/auth.dto";
const router = Router();

router.post(
  "/api/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>/]).{8,}$/)
      .withMessage("Password must contain uppercase, lowercase, number and special character"),
    body("userName").not().isEmpty().withMessage("Please enter a user name"),
    body("role")
      .isIn(["student", "instructor"])
      .withMessage("Invalid role specified"),
    
    body("educationLevel")
      .if(body("role").equals("student"))
      .not().isEmpty()
      .withMessage("Education level is required for students")
      .isIn(["high_school", "associate", "bachelor", "master", "doctorate", "other"])
      .withMessage("Invalid education level"),
    body("fieldOfStudy")
      .if(body("role").equals("student"))
      .not().isEmpty()
      .withMessage("Field of study is required for students")
      .trim()
      .isLength({ max: 50 })
      .withMessage("Field of study must be less than 50 characters"),
    
    body("expertise")
      .if(body("role").equals("instructor"))
      .not().isEmpty()
      .withMessage("Expertise is required for instructors")
      .trim()
      .isLength({ max: 50 })
      .withMessage("Expertise must be less than 50 characters"),
    body("yearsOfExperience")
      .if(body("role").equals("instructor"))
      .not().isEmpty()
      .withMessage("Years of experience is required for instructors")
      .isInt({ min: 0 })
      .withMessage("Years of experience must be a positive integer"),
    body("biography")
      .if(body("role").equals("instructor"))
      .not().isEmpty()
      .withMessage("Biography is required for instructors")
      .trim()
      .isLength({ min: 50, max: 500 })
      .withMessage("Biography must be between 50-500 characters")
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { 
      email, 
      password, 
      userName,
      role,
      educationLevel,
      fieldOfStudy,
      expertise,
      yearsOfExperience,
      biography
    } = req.body;
    const result = await authService.signup({
      email,
      password,
      RememberMe: false,
      userName,
      role,
      ...(role === "student" && { educationLevel, fieldOfStudy }),
      ...(role === "instructor" && { expertise, yearsOfExperience: parseInt(yearsOfExperience), biography })
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
  "/api/signin",
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
router.post("/api/signout",requireAuth, (req: Request, res: Response, next: NextFunction) => {
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
  "/api/current-user",
  requireAuth,
  currentUser,
  (req: Request, res: Response, next: NextFunction) => {
    res.status(200).send({ currentUser: req.currentUser });
  }
);

router.post(
  "/api/verify-email",
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
  "/api/resendEmail",
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
  "/api/request-reset-password",
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
  "/api/reset-password",
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
  "/api/verify-Otp",
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
  "/api/update-user",
  requireAuth,
  currentUser,
  [
    body("userName")
      .optional()
      .trim()
      .custom(value => {
        if (value.length < 3 || value.length > 20) return false;
        return true;
      })
      .withMessage('Username must be in "FirstName|LastName" format (3-20 chars each)'),
    body("profileImg")
      .optional()
      .isURL()
      .withMessage("Profile image must be a valid URL"),
    body("educationLevel")
      .optional()
      .isIn(["high_school", "associate", "bachelor", "master", "doctorate", "other"])
      .withMessage("Invalid education level"),
    body("fieldOfStudy")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Field of study must be less than 50 characters"),
    body("expertise")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Expertise must be less than 50 characters"),
    body("yearsOfExperience")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Years of experience must be a positive integer"),
    body("biography")
      .optional()
      .trim()
      .isLength({ min: 50, max: 500 })
      .withMessage("Biography must be between 50-500 characters")
  ],
  ValidationRequest,
  deleteImageInCloud,
  async (req: Request, res: Response, next: NextFunction) => {
    const updateData: updateData = req.body;
    if(updateData.profileImg && updateData.profileImg!==req.currentUser!.profileImg && !updateData.publicId ){
      return next(new BadRequestError("Profile image public id is required")); 
    }
    const userId = req.currentUser!.userId;
    const userRole = req.currentUser!.role;
     if (userRole === 'student') {
      if (updateData.educationLevel && !updateData.fieldOfStudy) {
        return next(new BadRequestError("Field of study is required with education level"));
      }
      if (updateData.fieldOfStudy && !updateData.educationLevel) {
        return next(new BadRequestError("Education level is required with field of study"));
      }
    }

    if (userRole === 'instructor') {
      if (updateData.expertise && !updateData.yearsOfExperience) {
        return next(new BadRequestError("Years of experience required with expertise"));
      }
      if (updateData.biography && updateData.biography.length < 50) {
        return next(new BadRequestError("Biography must be at least 50 characters"));
      }
    }

    

    const result = await authService.updateUser(userId, updateData);
    // const result = await authService.updateUser(userId, userName, profileImg);

    if (!result.success) return next(new BadRequestError(result.message));

    res.status(200).json({ message: result.message, jwt: result.jwt });
  }
);
export { router as authRouters };

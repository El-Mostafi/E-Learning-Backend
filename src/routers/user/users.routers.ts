import { Router, Request, Response, NextFunction } from "express";
import { body, param, query } from "express-validator";
import {
  BadRequestError,
  currentUser,
  deleteImageInCloud,
  requireAuth,
  ValidationRequest,
} from "../../../common"; // Adjust the import path
import { userService } from "../../service/user.service";
import { roleIsAdmin } from "../../../common/src/middllewares/validate-roles";
import mongoose from "mongoose";

const router = Router();

router.get(
  "/api/users",
  requireAuth,
  currentUser,
  roleIsAdmin,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer."),
    query("limit")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Limit must be a positive integer."),
    query("role")
      .optional()
      .isIn(["student", "instructor", "admin"])
      .withMessage("Invalid role."),
    query("status")
      .optional()
      .isIn(["active", "blocked"])
      .withMessage("Invalid status."),
    query("search").optional().isString().trim(),
  ],
  ValidationRequest,
  async (req: Request, res: Response) => {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      role: req.query.role as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    };
    // console.log(" options :",options);

    const result = await userService.getAllUsers(options);
    res.status(200).send(result);
  }
);

router.post(
  "/api/users",
  requireAuth,
  currentUser,
  roleIsAdmin,
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>/]).{8,}$/
      )
      .withMessage(
        "Password must contain uppercase, lowercase, number and special character"
      ),
    body("userName").not().isEmpty().withMessage("Please enter a user name"),
    body("role")
      .isIn(["admin", "student", "instructor"])
      .withMessage("Invalid role specified"),

    body("educationLevel")
      .if(body("role").equals("student"))
      .not()
      .isEmpty()
      .withMessage("Education level is required for students")
      .isIn([
        "high_school",
        "associate",
        "bachelor",
        "master",
        "doctorate",
        "other",
      ])
      .withMessage("Invalid education level"),
    body("fieldOfStudy")
      .if(body("role").equals("student"))
      .not()
      .isEmpty()
      .withMessage("Field of study is required for students")
      .trim()
      .isLength({ max: 50 })
      .withMessage("Field of study must be less than 50 characters"),

    body("expertise")
      .if(body("role").equals("instructor"))
      .not()
      .isEmpty()
      .withMessage("Expertise is required for instructors")
      .trim()
      .isLength({ max: 50 })
      .withMessage("Expertise must be less than 50 characters"),
    body("yearsOfExperience")
      .if(body("role").equals("instructor"))
      .not()
      .isEmpty()
      .withMessage("Years of experience is required for instructors")
      .isInt({ min: 0 })
      .withMessage("Years of experience must be a positive integer"),
    body("biography")
      .if(body("role").equals("instructor"))
      .not()
      .isEmpty()
      .withMessage("Biography is required for instructors")
      .trim()
      .isLength({ min: 50, max: 500 })
      .withMessage("Biography must be between 50-500 characters"),
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
      biography,
    } = req.body;

    try {
      const newUser = await userService.createUserByAdmin({
        email,
        password,
        RememberMe: false,
        userName,
        role,
        ...(role === "student" && { educationLevel, fieldOfStudy }),
        ...(role === "instructor" && {
          expertise,
          yearsOfExperience: parseInt(yearsOfExperience),
          biography,
        }),
      });
      res.status(201).send(newUser);
    } catch (err: any) {
      next(new BadRequestError(err.message || "Failed to create user"));
    }
  }
);

router.get(
  "/api/users/:id",
  requireAuth,
  currentUser,
  roleIsAdmin,
  [param("id").isMongoId().withMessage("Invalid user ID format")],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await userService.getUserById(req.params.id);
    res.status(200).send(user);
  }
);

router.put(
  "/api/users/:id",
  requireAuth,
  currentUser,
  roleIsAdmin,
  [
    param("id").isMongoId().withMessage("Invalid user ID format"),
    body("userName")
      .optional()
      .notEmpty()
      .withMessage("Username cannot be empty"),
    body("email").optional().isEmail().withMessage("Enter a valid email"),
    body("role")
      .optional()
      .isIn(["admin", "instructor", "student"])
      .withMessage("Invalid role"),
    body("status")
      .optional()
      .isIn(["active", "blocked"])
      .withMessage("Invalid status"),
    // Student fields
    body("educationLevel")
      .optional()
      .isString()
      .withMessage("educationLevel must be a string"),
    body("fieldOfStudy")
      .optional()
      .isString()
      .withMessage("fieldOfStudy must be a string"),
    // Instructor fields
    body("expertise")
      .optional()
      .isString()
      .withMessage("expertise must be a string"),
    body("yearsOfExperience")
      .optional()
      .isNumeric()
      .withMessage("yearsOfExperience must be a number"),
    body("biography")
      .optional()
      .isString()
      .withMessage("biography must be a string"),
    body("profileImg")
          .optional()
          .isURL()
          .withMessage("Profile image must be a valid URL"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await userService.updateUserByAdmin(
      new mongoose.Types.ObjectId(req.params.id),
      req.body
    );

    if (!result.success) {
      return next(new BadRequestError(result.message));
    }
    res.status(200).send(result.user);
  }
);

router.patch(
  "/api/users/:id/status",
  requireAuth,
  currentUser,
  roleIsAdmin,
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("status")
      .isIn(["active", "blocked"])
      .withMessage("Status must be 'active' or 'blocked'"),
  ],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { status } = req.body;
    try {
      await userService.updateUserStatus(req.params.id, status);

    res.status(200).send({
      message: `User has been successfully ${status}.`
    });
    } catch (err: any) {
      return next(new BadRequestError(err.message));
    }
  }
);

router.delete(
  "/api/users/:id",
  requireAuth,
  currentUser,
  roleIsAdmin,
  deleteImageInCloud,
  [param("id").isMongoId().withMessage("Invalid user ID format")],
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await userService.deleteUser(req.params.id);
      res.status(200).send({ message: "User deleted successfully" });
    } catch (err: any) {
      return next(new BadRequestError(err.message));
    }
  }
);

export { router as userRouters };

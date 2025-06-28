import { Router, Request, Response, NextFunction } from "express";
import { body, param } from "express-validator";
import { CouponrService } from "../../service/course/coupon.service";
import {
  BadRequestError,
  currentUser,
  NotFoundError,
  requireAuth,
  ValidationRequest,
} from "../../../common";
import { roleIsInstructor } from "../../../common/src/middllewares/validate-roles";
import mongoose from "mongoose";
import { CreateCouponDto, UpdateCouponDto } from "./dtos/course.dto";

const router = Router();
const couponService = new CouponrService();

// Validation rules for creating a coupon
const createCouponValidation = [
  param("courseId").isMongoId().withMessage("Invalid course ID format"),

  body("code")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Coupon code must be between 3 and 20 characters")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Coupon code can only contain uppercase letters and numbers"),

  body("discountPercentage")
    .isInt({ min: 1, max: 100 })
    .withMessage("Discount percentage must be between 1 and 100"),

  body("maxUses").isInt({ min: 1 }).withMessage("Max uses must be at least 1"),

  body("expiryDate")
    .isISO8601()
    .withMessage("Expiry date must be a valid ISO 8601 date")
    .custom((value) => {
      const expiryDate = new Date(value);
      const now = new Date();
      if (expiryDate <= now) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),
];

// Validation rules for updating a coupon
const updateCouponValidation = [
  param("courseId").isMongoId().withMessage("Invalid course ID format"),

  param("couponId").isMongoId().withMessage("Invalid coupon ID format"),

  body("code")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Coupon code must be between 3 and 20 characters")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Coupon code can only contain uppercase letters and numbers"),

  body("discountPercentage")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Discount percentage must be between 1 and 100"),

  body("maxUses")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max uses must be at least 1"),

  body("expiryDate")
    .optional()
    .isISO8601()
    .withMessage("Expiry date must be a valid ISO 8601 date")
    .custom((value) => {
      if (value) {
        const expiryDate = new Date(value);
        const now = new Date();
        if (expiryDate <= now) {
          throw new Error("Expiry date must be in the future");
        }
      }
      return true;
    }),
];

// Validation rules for course ID param only
const courseIdValidation = [
  param("courseId").isMongoId().withMessage("Invalid course ID format"),
];

// Validation rules for both course ID and coupon ID params
const courseAndCouponIdValidation = [
  param("courseId").isMongoId().withMessage("Invalid course ID format"),

  param("couponId").isMongoId().withMessage("Invalid coupon ID format"),
];

// POST: Add a new coupon to a course
router.post(
  "/api/instructors/courses/:courseId/coupons",
  requireAuth,
  currentUser,
  roleIsInstructor,
  [
    param("courseId").isMongoId().withMessage("Invalid course ID format"),

    body("code")
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage("Coupon code must be between 3 and 20 characters")
      .matches(/^[A-Z0-9]+$/)
      .withMessage(
        "Coupon code can only contain uppercase letters and numbers"
      ),

    body("discountPercentage")
      .isInt({ min: 1, max: 100 })
      .withMessage("Discount percentage must be between 1 and 100"),

    body("maxUses")
      .isInt({ min: 1 })
      .withMessage("Max uses must be at least 1"),

    body("expiryDate")
      .isISO8601()
      .withMessage("Expiry date must be a valid ISO 8601 date")
      .custom((value) => {
        const expiryDate = new Date(value);
        const now = new Date();
        if (expiryDate <= now) {
          throw new Error("Expiry date must be in the future");
        }
        return true;
      }),
  ],
  ValidationRequest, // Apply validation middleware
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.currentUser!.userId;
      const { courseId } = req.params;
      const { code, discountPercentage, maxUses, expiryDate } = req.body;

      const couponData: CreateCouponDto = {
        courseId,
        code: code.toUpperCase().trim(),
        discountPercentage: parseInt(discountPercentage),
        maxUses: parseInt(maxUses),
        expiryDate: new Date(expiryDate),
      };

      const updatedCourse = await couponService.addCouponToCourse(
        new mongoose.Types.ObjectId(instructorId),
        new mongoose.Types.ObjectId(courseId),
        couponData
      );

      res.status(201).json({
        message: "Coupon added successfully",
        coupon: updatedCourse.coupons[updatedCourse.coupons.length - 1],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/instructors/courses/coupons",
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.currentUser!.userId;

      const coursesWithCoupons =
        await couponService.getAllInstructorCoursesWithCoupons(
          new mongoose.Types.ObjectId(instructorId)
        );
      // console.log(coursesWithCoupons);
      res.status(200).json({
        totalCourses: coursesWithCoupons.length,
        courses: coursesWithCoupons,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET: Get all coupons for a course
router.get(
  "/api/instructors/courses/:courseId/coupons",
  requireAuth,
  currentUser,
  roleIsInstructor,
  courseIdValidation,
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.currentUser!.userId;
      const { courseId } = req.params;

      const coupons = await couponService.getCourseCoupons(
        new mongoose.Types.ObjectId(instructorId),
        new mongoose.Types.ObjectId(courseId)
      );

      res.status(200).json(coupons);
    } catch (error) {
      next(error);
    }
  }
);

// PUT: Update a coupon
router.put(
  "/api/instructors/courses/:courseId/coupons/:couponId",
  requireAuth,
  currentUser,
  roleIsInstructor,
  updateCouponValidation,
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.currentUser!.userId;
      const { courseId, couponId } = req.params;
      const updateData: UpdateCouponDto = {};

      // Only include fields that are provided in the request body
      if (req.body.code) updateData.code = req.body.code.toUpperCase().trim();
      if (req.body.discountPercentage)
        updateData.discountPercentage = parseInt(req.body.discountPercentage);
      if (req.body.maxUses) updateData.maxUses = parseInt(req.body.maxUses);
      if (req.body.expiryDate)
        updateData.expiryDate = new Date(req.body.expiryDate);

      const updatedCourse = await couponService.updateCoupon(
        new mongoose.Types.ObjectId(instructorId),
        new mongoose.Types.ObjectId(courseId),
        new mongoose.Types.ObjectId(couponId),
        updateData
      );

      const updatedCoupon = updatedCourse.coupons.id(couponId);

      res.status(200).json({
        message: "Coupon updated successfully",
        coupon: updatedCoupon,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE: Remove a coupon from a course
router.delete(
  "/api/instructors/courses/:courseId/coupons/:couponId",
  requireAuth,
  currentUser,
  roleIsInstructor,
  courseAndCouponIdValidation,
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.currentUser!.userId;
      const { courseId, couponId } = req.params;

      await couponService.removeCouponFromCourse(
        new mongoose.Types.ObjectId(instructorId),
        new mongoose.Types.ObjectId(courseId),
        new mongoose.Types.ObjectId(couponId)
      );

      res.status(200).json({
        message: "Coupon removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET: Get a specific coupon by ID
router.get(
  "/api/instructors/courses/:courseId/coupons/:couponId",
  requireAuth,
  currentUser,
  roleIsInstructor,
  courseAndCouponIdValidation,
  ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.currentUser!.userId;
      const { courseId, couponId } = req.params;

      const coupon = await couponService.getCouponById(
        new mongoose.Types.ObjectId(instructorId),
        new mongoose.Types.ObjectId(courseId),
        new mongoose.Types.ObjectId(couponId)
      );

      res.status(200).json(coupon);
    } catch (error) {
      next(error);
    }
  }
);

export { router as couponRouters };

import { NextFunction, Router, Request, Response } from "express";
import { body } from "express-validator";
import { CourseDto, CourseDtoWithCoupons } from "./dtos/course.dto";
import { CourseService } from "../../service/course/course.service";
import {
  BadRequestError,
  currentUser,
  requireAuth,
  ValidationRequest,
  updateFileTags,
  deleteVideosImageInCourse,
} from "../../../common";
import { roleIsInstructor } from "../../../common/src/middllewares/validate-roles";

const router = Router();
const courseService = new CourseService();

router.get(
  "/api/courses",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await courseService.findPublishedCourses();
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.courses!);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/courses/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const result = await courseService.findOneById(id);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.course!);
    } catch (error) {
      next(error);
    }
  }
);
router.get(
  "/api/courses/:id/update-course",
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const userId = req.currentUser!.userId;
      const result = await courseService.findOneByIdForUpdate(userId, courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.course!);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/courses/category/:categoryId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId = req.params.categoryId;
      const result = courseService.findAllByCategoryId(categoryId);
    } catch (error) {
      next(error);
    }
  }
);
router.get(
  "/api/courses/instructor/my-courses",
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.currentUser!.userId;
      const result = await courseService.findAllByInstructorId(instructorId);

      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }

      res.status(200).send(result.courses!);
    } catch (error) {
      next(error);
    }
  }
);
router.post(
  "/api/courses/create-course",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("description")
      .not()
      .isEmpty()
      .withMessage("Please enter a description"),
    body("thumbnailPreview")
      .not()
      .isEmpty()
      .withMessage("Please enter a cover image URL"),
    body("imgPublicId").not().isEmpty().withMessage("Please enter a publicId"),
    body("level").not().isEmpty().withMessage("Please enter a level"),
    body("language").not().isEmpty().withMessage("Please enter a language"),
    body("pricing.price").isNumeric().withMessage("Please enter a valid price"),
    body("pricing.isFree").isBoolean().withMessage("isFree must be a boolean"),
    body("oldPrice")
      .optional()
      .isNumeric()
      .withMessage("Please enter a valid old price"),
    body("category.name")
      .not()
      .isEmpty()
      .withMessage("Please enter a category name"),
    body("coupons")
      .optional()
      .isArray()
      .withMessage("Coupons must be an array"),
    body("coupons.*.code").notEmpty().withMessage("Coupon code is required"),
    body("coupons.*.discountPercentage")
      .isNumeric()
      .withMessage("Discount percentage must be a number"),
    body("coupons.*.maxUses")
      .isInt({ min: 1 })
      .withMessage("Max uses must be an integer greater than 0"),
    body("coupons.*.expiryDate")
      .isISO8601()
      .withMessage("Expiry date must be a valid date"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseDto = req.body as CourseDtoWithCoupons;
      const userId = req.currentUser!.userId;

      const result = await courseService.create(courseDto, userId);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(201).send({
        message: result.message,
        success: result.success,
        courseId: result.courseId,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/api/courses/:id/update-course",
  [
  body("title").not().isEmpty().withMessage("Please enter a title"),
    body("description")
      .not()
      .isEmpty()
      .withMessage("Please enter a description"),
    body("thumbnailPreview")
      .not()
      .isEmpty()
      .withMessage("Please enter a cover image URL"),
    body("imgPublicId").not().isEmpty().withMessage("Please enter a publicId"),
    body("level").not().isEmpty().withMessage("Please enter a level"),
    body("language").not().isEmpty().withMessage("Please enter a language"),
    body("pricing.price").isNumeric().withMessage("Please enter a valid price"),
    body("pricing.isFree").isBoolean().withMessage("isFree must be a boolean"),
    body("oldPrice")
      .optional()
      .isNumeric()
      .withMessage("Please enter a valid old price"),
    body("category.name")
      .not()
      .isEmpty()
      .withMessage("Please enter a category name"),
    body("coupons")
      .optional()
      .isArray()
      .withMessage("Coupons must be an array"),
    body("coupons.*.code").notEmpty().withMessage("Coupon code is required"),
    body("coupons.*.discountPercentage")
      .isNumeric()
      .withMessage("Discount percentage must be a number"),
    body("coupons.*.maxUses")
      .isInt({ min: 1 })
      .withMessage("Max uses must be an integer greater than 0"),
    body("coupons.*.expiryDate")
      .isISO8601()
      .withMessage("Expiry date must be a valid date"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.id;
      const courseDto = req.body as CourseDtoWithCoupons;
      const result = await courseService.updateOneById(
        userId,
        courseId,
        courseDto
      );
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(201).send({
        message: result.message,
        success: result.success
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/api/courses/:id/publish",
  [
    body("publicIds")
      .isArray()
      .not()
      .isEmpty()
      .withMessage("Please enter a publicIds"),
  ],
  requireAuth,
  currentUser,
  roleIsInstructor,
  updateFileTags,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.id;
      const result = await courseService.publishOneById(userId, courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.send(result.message);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/api/courses/:id/unpublish",
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.id;
      const result = await courseService.unpublishOneById(userId, courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.send(result.message);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/api/courses/delete/:id",
  requireAuth,
  currentUser,
  roleIsInstructor,
  deleteVideosImageInCourse,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.id;
      const result = await courseService.deleteOneById(userId, courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(200).send(result.message);
    } catch (error) {
      next(error);
    }
  }
);

export { router as courseRouter };

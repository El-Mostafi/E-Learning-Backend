import { NextFunction, Router, Request, Response } from "express";
import { body, query } from "express-validator";
import { CourseDto, CourseDtoWithCoupons, FindAllInstructorCoursesOptions, InstructorCoursesSortOption } from "./dtos/course.dto";
import { CourseService } from "../../service/course/course.service";
import {
  BadRequestError,
  currentUser,
  requireAuth,
  ValidationRequest,
  updateFileTags,
  deleteVideosImageInCourse,
} from "../../../common";
import {
  roleIsAdmin,
  roleIsInstructor,
  roleIsInstructorOrAdmin,
  roleIsStudent,
} from "../../../common/src/middllewares/validate-roles";
import mongoose from "mongoose";
import { Level, Language } from "../../models/course";
import { UserRole } from "../../models/user";

const router = Router();
const courseService = new CourseService();

router.get(
  "/api/courses",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.currentPage as string) || 1;
      const limit = parseInt(req.query.limit as string) || 9;
      const sortOption = req.query.sortOption as string;

      let filterParams: any = {};
      if (req.query.filterParams && typeof req.query.filterParams === 'string') {
        try {
          filterParams = JSON.parse(req.query.filterParams as string);
        } catch (parseError) {
          console.error('Error parsing filterParams:', parseError);
          filterParams = {};
        }
      }

      if (filterParams?.ratings) {
        filterParams.ratings = filterParams.ratings.map((rating: string | number) =>
          typeof rating === 'string' ? parseInt(rating) : rating
        );
      }

      // console.log("Hello from Here!")

      const result = await courseService.findPublishedCourses(
        page,
        limit,
        sortOption,
        filterParams
      );
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result);
    } catch (error) {
      // console.log(error)
      next(error);
    }
  }
);
router.get(
  "/api/courses/overview",
  requireAuth,
  currentUser,
  roleIsAdmin, // Assuming only admins can see this overview
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer."),
    query("limit")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Limit must be a positive integer."),
    query("status")
      .optional()
      .isIn(["published", "draft"])
      .withMessage("Invalid status. Must be 'published' or 'draft'."),
    query("search").optional().isString().trim(),
    query("category").optional().isString().trim(),
    query("level")
      .optional()
      .isIn(Object.values(Level))
      .withMessage("Invalid course level."),
    query("language")
      .optional()
      .isIn(Object.values(Language))
      .withMessage("Invalid course language."),
  ],
  ValidationRequest,
  async (req: Request, res: Response) => {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: req.query.search as string | undefined,
      status: req.query.status as "published" | "draft" | undefined,
      category: req.query.category as string | undefined,
      level: req.query.level as string | undefined,
      language: req.query.language as string | undefined,
    };

    const result = await courseService.getAllCourses(options);

    res.status(200).send(result);
  }
);
router.get(
  "/api/courses/categories",

  async (req: Request, res: Response) => {
    try {
      const categories = await courseService.getAllCategories();
      res.status(200).send(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).send({ message: "Error fetching categories" });
    }
  }
);
router.get(
  "/api/courses/languages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Fetching distinct course languages...");
      const result = await courseService.getUsedLanguages();
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.languages);
    } catch (error) {
      next(error);
    }
  }
);
router.get(
  "/api/courses/:courseId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.courseId;
      const userId = req.query.userId as string;
      const objectuserId = userId ? new mongoose.Types.ObjectId(userId) : null;
      const result = await courseService.findOneById(courseId, objectuserId);
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
  roleIsInstructorOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const userId = req.currentUser!.userId;
      const userRole = req.currentUser!.role;
      const result = await courseService.findOneByIdForUpdate(
        userId,
        courseId,
        userRole
      );
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
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId = req.params.categoryId;
      const userId = req.currentUser?.userId;
      const result = await courseService.findAllByCategoryId(
        categoryId,
        userId
      );
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.send(result.courses);
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
  [
      body("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer."),
      body("limit")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Limit must be a positive integer."),
      body("sort")
        .optional()
        .isIn(["title","newest", "popularity","rating"])
        .withMessage("Invalid role."),
      body("search").optional().isString().trim(),
    ],
    ValidationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.currentUser!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const sort = (req.query.sort as InstructorCoursesSortOption) || "newest";

      const options: FindAllInstructorCoursesOptions = {
        page,
        limit,
        search,
        sort,
      };
      const result = await courseService.findAllByInstructorId(instructorId, options);

      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }

      res.status(200).send(result);
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
  roleIsInstructorOrAdmin,
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
  roleIsInstructorOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const userRole = req.currentUser!.role;
      const courseId = req.params.id;
      const courseDto = req.body as CourseDtoWithCoupons;
      const result = await courseService.updateOneById(
        userId,
        courseId,
        courseDto,
        userRole
      );
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(201).send({
        message: result.message,
        success: result.success,
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
  roleIsInstructorOrAdmin,
  updateFileTags,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const UserRole = req.currentUser!.role;
      const courseId = req.params.id;
      const result = await courseService.publishOneById(
        userId,
        courseId,
        UserRole
      );
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
  "/api/courses/:id/toggle-publish",
  requireAuth,
  currentUser,
  roleIsAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const result = await courseService.togglePublishStatus(courseId);

      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(200).send({
        success: true,
        message: result.message,
        isPublished: result.isPublished,
      });
    } catch (error) {
      next(error);
    }
  }
);
router.put(
  "/api/courses/:id/unpublish",
  requireAuth,
  currentUser,
  roleIsInstructorOrAdmin,
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
  roleIsInstructorOrAdmin,
  deleteVideosImageInCourse,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const UserRole = req.currentUser!.role;
      const courseId = req.params.id;
      const result = await courseService.deleteOneById(userId, courseId, UserRole);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(200).send(result.message);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/categories",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filteringData = await courseService.getCoursesFilteringData();
      res.status(200).send(filteringData);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/courses/verify-coupon",
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, couponCode } = req.body;
      const result = await courseService.verifyCoupon(courseId, couponCode);

      res.status(200).json(result.discountPercentage);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/courses/:courseId/check-enrollment",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const userId = req.currentUser!.userId;
      const result = await courseService.checkEnrollment(userId, courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.success!);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/courses/published/count",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await courseService.getPublishedCoursesCount();
      res.status(200).send({ count });
    } catch (error) {
      next(error);
    }
  }
);

export { router as courseRouter };

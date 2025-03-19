import { NextFunction, Router, Request, Response } from "express";
import { body } from "express-validator";
import { CourseDto } from "./dtos/course.dto";
import { CourseService } from "../../service/course/course.service";
import {
  BadRequestError,
  currentUser,
  requireAuth,
  ValidationRequest,
} from "../../../common";
import { roleIsInstructor } from "../../../common/src/middllewares/validate-roles";

const router = Router();
const courseService = new CourseService();

router.get("/api/courses", async (req, res, next) => {
  try {
    const result = await courseService.findPublishedCourses();
    if (!result.success) {
      return next(new BadRequestError(result.message!));
    }
    res.send(result.courses!);
  } catch (error) {
    next(error);
  }
});

router.get("/api/courses/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await courseService.findOneById(id);
    if (!result.success) {
      return next(new BadRequestError(result.message!));
    }
    res.send(result.course!);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/api/courses/category/:categoryId",
  async (req, res, next) => {
    try{
        const categoryId = req.params.categoryId;
        const result = courseService.findAllByCategoryId(categoryId);
    }catch(error){
        next(error)
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
    body("coverImg")
      .not()
      .isEmpty()
      .withMessage("Please enter a cover image URL"),
    body("level").not().isEmpty().withMessage("Please enter a level"),
    body("language").not().isEmpty().withMessage("Please enter a language"),
    body("price").isNumeric().withMessage("Please enter a valid price"),
    body("oldPrice")
      .optional()
      .isNumeric()
      .withMessage("Please enter a valid old price"),
    body("category.name")
      .not()
      .isEmpty()
      .withMessage("Please enter a category name"),
    body("category.description")
      .optional()
      .isString()
      .withMessage("Please enter a valid category description"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseDto = req.body as CourseDto;
      const userId = req.currentUser!.userId;
      const result = await courseService.create(courseDto, userId);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(201).send(result.message);
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
    body("coverImg")
      .not()
      .isEmpty()
      .withMessage("Please enter a cover image URL"),
    body("level").not().isEmpty().withMessage("Please enter a level"),
    body("language").not().isEmpty().withMessage("Please enter a language"),
    body("price").isNumeric().withMessage("Please enter a valid price"),
    body("oldPrice")
      .optional()
      .isNumeric()
      .withMessage("Please enter a valid old price"),
    body("category.name")
      .not()
      .isEmpty()
      .withMessage("Please enter a category name"),
    body("category.description")
      .optional()
      .isString()
      .withMessage("Please enter a valid category description"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.id;
      const courseDto = req.body as CourseDto;
      const result = await courseService.updateOneById(
        userId,
        courseId,
        courseDto
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
  "/api/courses/:id/publish",
  requireAuth,
  currentUser,
  roleIsInstructor,
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.id;
      const result = await courseService.deleteOneById(userId, courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.send(result.message);
    } catch (error) {
      next(error);
    }
  }
);

export { router as courseRouter };

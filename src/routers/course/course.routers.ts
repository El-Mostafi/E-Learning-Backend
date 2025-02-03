import { NextFunction, Router, Request, Response } from "express";
import { body } from "express-validator";
import { CourseDto } from "./dtos/course.dto";
import { CourseService } from "../../service/course/course.service";
import {
  BadRequestError,
  currentUser,
  ValidationRequest,
} from "../../../common";

const router = Router();
const courseService = new CourseService();

router.get("/api/courses", async (req, res, next) => {
  const courses = await courseService.findAll();
  res.send(courses);
});

router.get("/api/courses/:id", async (req, res, next) => {
  const id = req.params.id;
  const course = await courseService.findOneById(id);
  if (!course) {
    return next(new BadRequestError("Course not found"));
  }
  res.send(course);
});

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
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    const courseDto = req.body as CourseDto;
    try {
      const userId = req.currentUser!.userId;
      const course = await courseService.create(courseDto, userId);
      res.status(201).send(course);
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
    body("instructorId")
      .not()
      .isEmpty()
      .withMessage("Please enter an instructor ID"),
  ],
  ValidationRequest,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const courseDto = req.body as CourseDto;
    try {
      const course = await courseService.updateOneById(id, courseDto);
      if (!course) {
        return next(new BadRequestError("Course not found"));
      }
      res.send(course);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/api/courses/:id/publish",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const course = await courseService.publishOneById(id);
      if (!course) {
        return next(new BadRequestError("Course not found"));
      }
      res.send(course);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/api/courses/:id/unpublish",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const course = await courseService.unpublishOneById(id);
      if (!course) {
        return next(new BadRequestError("Course not found"));
      }
      res.send(course);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/api/courses/delete/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const course = await courseService.deleteOneById(id);
      if (!course) {
        return next(new BadRequestError("Course not found"));
      }
      res.send(course);
    } catch (error) {
      next(error);
    }
  }
);

export { router as courseRouter };

import { NextFunction, Request, Response, Router } from "express";
import { body } from "express-validator";
import { SectionService } from "../../service/course/section.service";
import {
  BadRequestError,
  currentUser,
  requireAuth,
  ValidationRequest,
} from "../../../common";
import { SectionDto } from "./dtos/course.dto";
import {
  roleIsInstructor,
  roleIsInstructorOrAdmin,
} from "../../../common/src/middllewares/validate-roles";

const router = Router();
const sectionService = new SectionService();

router.get(
  "/api/courses/:id/sections",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const result = await sectionService.findAll(courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.send(result.sections!);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/courses/:id/sections/:sectionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const sectionId = req.params.sectionId;
      const result = await sectionService.findOne(courseId, sectionId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.send(result.section!);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/courses/:id/sections/create-section",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("orderIndex")
      .not()
      .isEmpty()
      .withMessage("Please enter an order index"),
    body("description")
      .not()
      .isEmpty()
      .withMessage("Please enter a description"),
    body("isPreview")
      .not()
      .isEmpty()
      .withMessage("Please enter a preview status"),
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
      const sectionDto = req.body as SectionDto;
      const result = await sectionService.create(
        userId,
        courseId,
        sectionDto,
        userRole
      );
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(201).send({
        message: result.message,
        success: result.success,
        sectionId: result.sectionId,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/api/courses/:id/sections/:sectionId/update-section",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("orderIndex")
      .not()
      .isEmpty()
      .withMessage("Please enter an order index"),
    body("isPreview")
      .not()
      .isEmpty()
      .withMessage("Please enter a preview status"),
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
      const sectionId = req.params.sectionId;
      const sectionDto: SectionDto = req.body;
      const result = await sectionService.update(
        userId,
        courseId,
        sectionId,
        sectionDto,
        userRole
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

router.delete(
  "/api/courses/:id/sections/:sectionId/delete-section",
  requireAuth,
  currentUser,
  roleIsInstructorOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const userRole = req.currentUser!.role;
      const courseId = req.params.id;
      const sectionId = req.params.sectionId;
      const result = await sectionService.delete(userId, courseId, sectionId, userRole);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.send(result.message);
    } catch (error) {
      next(error);
    }
  }
);

export { router as sectionRouter };

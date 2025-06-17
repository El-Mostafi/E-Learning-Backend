import {
  BadRequestError,
  currentUser,
  requireAuth,
  ValidationRequest,
} from "../../../common";
import { NextFunction, Request, Response, Router } from "express";
import { body } from "express-validator";
import { LectureService } from "../../service/course/lecture.service";
import { LectureDto } from "./dtos/course.dto";
import {
  roleIsInstructor,
  roleIsInstructorOrAdmin,
} from "../../../common/src/middllewares/validate-roles";

const router = Router();

const lectureService = new LectureService();

router.get(
  "/api/courses/:id/sections/:sectionId/lectures",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const sectionId = req.params.sectionId;
      const result = await lectureService.findAll(courseId, sectionId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.send(result.lectures!);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/courses/:id/sections/:sectionId/lectures:lectureId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const sectionId = req.params.sectionId;
      const lectureId = req.params.lectureId;
      const result = await lectureService.findOne(
        courseId,
        sectionId,
        lectureId
      );
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.send(result.lecture!);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/courses/:id/sections/:sectionId/lectures/create-lecture",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("duration").not().isEmpty().withMessage("Please enter a duration"),
    body("videoUrl").not().isEmpty().withMessage("Please enter a video URL"),
    body("description")
      .not()
      .isEmpty()
      .withMessage("Please enter a description"),
    body("publicId").not().isEmpty().withMessage("Please enter a publicId"),
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
      const lectureDto: LectureDto = req.body;
      const result = await lectureService.create(
        userId,
        courseId,
        sectionId,
        lectureDto,
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
  "/api/courses/:id/sections/:sectionId/lectures/:lectureId/update-lecture",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("duration").not().isEmpty().withMessage("Please enter a duration"),
    body("videoUrl").not().isEmpty().withMessage("Please enter a video URL"),
    body("thumbnailUrl")
      .not()
      .isEmpty()
      .withMessage("Please enter a thumbnail URL"),
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
      const lectureId = req.params.lectureId;
      const lectureDto = req.body as LectureDto;
      const result = await lectureService.update(
        userId,
        courseId,
        sectionId,
        lectureId,
        lectureDto,
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

router.delete(
  "/api/courses/:id/sections/:sectionId/lectures/:lectureId/delete-lecture",
  requireAuth,
  currentUser,
  roleIsInstructorOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const userRole = req.currentUser!.role;
      const courseId = req.params.id;
      const sectionId = req.params.sectionId;
      const lectureId = req.params.lectureId;
      const result = await lectureService.delete(
        userId,
        courseId,
        sectionId,
        lectureId,
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

export { router as lectureRouter };

import { NextFunction, Request, Response, Router } from "express";
import { body } from "express-validator";
import { ExamService } from "../../service/course/exam.service";
import {
  BadRequestError,
  currentUser,
  requireAuth,
  ValidationRequest,
} from "../../../common";
import { ExamDto } from "./dtos/course.dto";
import { roleIsInstructor, roleIsInstructorOrAdmin } from "../../../common/src/middllewares/validate-roles";

const router = Router();
const examService = new ExamService();

router.get(
  "/api/courses/:id/exams",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const result = await examService.findAll(courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.send(result.exams!);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/courses/:id/exams/:examId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const examId = req.params.examId;
      const result = await examService.findOne(courseId, examId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.send(result.exam!);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/courses/:id/exams/create-exam",
  [
    body("question").notEmpty().withMessage("Question is required"),
    body("options.A").notEmpty().withMessage("Option A is required"),
    body("options.B").notEmpty().withMessage("Option B is required"),
    body("options.C").notEmpty().withMessage("Option C is required"),
    body("options.D").notEmpty().withMessage("Option D is required"),
    body("correctAnswer").isIn(["A", "B", "C", "D"]).withMessage("Correct answer must be A, B, C, or D"),
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
      const examDto = req.body as ExamDto;
      const result = await examService.create(userId, courseId, examDto, userRole);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res
        .status(201)
        .send({
          message: result.message,
          success: result.success,
        });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/api/courses/:id/exams/:examId/update-exam",
  [
    body("question").notEmpty().withMessage("Question is required"),
    body("options.A").notEmpty().withMessage("Option A is required"),
    body("options.B").notEmpty().withMessage("Option B is required"),
    body("options.C").notEmpty().withMessage("Option C is required"),
    body("options.D").notEmpty().withMessage("Option D is required"),
    body("correctAnswer").isIn(["A", "B", "C", "D"]).withMessage("Correct answer must be A, B, C, or D"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  roleIsInstructorOrAdmin,

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.id;
      const examId = req.params.examId;
      const examDto: ExamDto = req.body;
      const userRole = req.currentUser!.role;
      const result = await examService.update(
        userId,
        courseId,
        examId,
        examDto,
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
  "/api/courses/:id/exams/:examId/delete-exam",
  requireAuth,
  currentUser,
  roleIsInstructorOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.id;
      const examId = req.params.examId;
      const userRole = req.currentUser!.role;
      const result = await examService.delete(userId, courseId, examId, userRole);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.send(result.message);
    } catch (error) {
      next(error);
    }
  }
);

export { router as examRouter };

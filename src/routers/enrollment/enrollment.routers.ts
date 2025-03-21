import { BadRequestError, currentUser, requireAuth } from "../../../common";
import { NextFunction, Request, Response, Router } from "express";
import { EnrollmentService } from "../../service/enrollment/enrollment.service";
import mongoose, { trusted } from "mongoose";
import { roleIsStudent } from "../../../common/src/middllewares/validate-roles";

const router = Router();
const enrollmentService = new EnrollmentService();

router.post(
  "/api/courses/:courseId/enroll",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const result = await enrollmentService.enroll(courseId, userId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.enrollment!);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/api/my-courses/enrolled",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const result = await enrollmentService.findAll(userId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.courses);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/my-courses/enrolled/:courseId",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = req.params.courseId;
      const result = await enrollmentService.findOneById(userId, courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.course!);
    } catch (error: any) {
      next(error);
    }
  }
);

router.put(
  "/api/my-courses/enrolled:courseId/update-progress",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const userId = req.currentUser!.userId;
      const result = await enrollmentService.updateProgress(courseId, userId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.enrollment!);

      // To define redirecting later for the next lecture.....
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/api/my-courses/:courseId/enrollment/withdraw",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const userId = req.currentUser!.userId;
      const result = await enrollmentService.withdraw(courseId, userId);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(200).send(result.message);
    } catch (error: any) {
      next(error);
    }
  }
);

export { router as enrollmentRouter };

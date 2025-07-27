import { BadRequestError, currentUser, requireAuth } from "../../../common";
import { NextFunction, Request, Response, Router } from "express";
import { EnrollmentService } from "../../service/enrollment/enrollment.service";
import mongoose, { trusted } from "mongoose";
import { roleIsStudent } from "../../../common/src/middllewares/validate-roles";
import {
  EnrolledCoursesSortOption,
  FindAllEnrollmentsOptions,
} from "./dtos/enrollement.dto";

const router = Router();
const enrollmentService = new EnrollmentService();

// router.post(
//   "/api/courses/:courseId/enroll",
//   requireAuth,
//   currentUser,
//   roleIsStudent,
//   async (req: Request, res: Response, next: NextFunction) => {
//     const session = await mongoose.startSession();
//     try {
//       await session.withTransaction(async () => {
//         const userId = req.currentUser!.userId;
//         const courseId = new mongoose.Types.ObjectId(req.params.courseId);
//         const result = await enrollmentService.enroll(courseId, userId, session);
//         if (!result.success) {
//           throw new BadRequestError(result.message!);
//         }
//         res.status(200).send(result.message!);
//       });
//     } catch (error: any) {
//       next(error);
//     } finally {
//       await session.endSession();
//     }
//   }
// );

router.get(
  "/api/my-courses/overview",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const result = await enrollmentService.findAllOverview(userId);
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
  "/api/my-courses/enrolled",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const sort = (req.query.sort as EnrolledCoursesSortOption) || "newest";

      const validSortOptions: EnrolledCoursesSortOption[] = [
        "newest",
        "title",
        "progress",
        "rating",
      ];
      if (!validSortOptions.includes(sort)) {
        return next(new BadRequestError("Invalid sort option."));
      }

      const options: FindAllEnrollmentsOptions = {
        page,
        limit,
        search,
        sort,
      };

      const userId = req.currentUser!.userId;

      const result = await enrollmentService.findAll(userId, options);

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  }
);
router.get(
  "/api/my-courses/enrolled/ids",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;

      const result = await enrollmentService.findAllIds(userId);

      res.status(200).send(result);
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
      // console.log(result);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.enrollment!);
    } catch (error: any) {
      next(error);
    }
  }
);

router.put(
  "/api/my-courses/enrolled/:courseId/update-progress/:sectionId/:lectureId",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const sectionId = new mongoose.Types.ObjectId(req.params.sectionId);
      const lectureId = new mongoose.Types.ObjectId(req.params.lectureId);
      const userId = req.currentUser!.userId;
      const result = await enrollmentService.updateProgress(
        courseId,
        sectionId,
        lectureId,
        userId
      );
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.enrollment!);
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
router.put(
  "/api/my-courses/enrolled/:courseId/quiz-pass",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const userId = req.currentUser!.userId;
      const { score } = req.body;

      if (typeof score !== "number" || score < 0) {
        return next(new BadRequestError("Invalid score provided"));
      }

      const result = await enrollmentService.markQuizPassed(
        courseId,
        userId,
        score
      );

      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }

      res.status(200).send(result.enrollment);
    } catch (error) {
      next(error);
    }
  }
);

export { router as enrollmentRouter };

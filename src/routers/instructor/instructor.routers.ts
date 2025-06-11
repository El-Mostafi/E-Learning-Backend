import { Router, Request, Response, NextFunction } from "express";
import { InstructorService } from "../../service/instructor.service";
import {
  BadRequestError,
  currentUser,
  NotFoundError,
  requireAuth,
} from "../../../common";
import { roleIsInstructor } from "../../../common/src/middllewares/validate-roles";
import mongoose from "mongoose";
import { InstructorStats } from "./dtos/instructor.dtos";

const router = Router();
const instructorService = new InstructorService();


router.get(
  "/api/instructors/dashboard",
  requireAuth,
  currentUser,
  roleIsInstructor,
  async (req: Request, res: Response, next: NextFunction) => {
    const instructorId = req.currentUser!.userId;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return next(new BadRequestError("Invalid instructor ID"));
    }

    const stats : InstructorStats = await instructorService.getDashboardStats(
      new mongoose.Types.ObjectId(instructorId)
    );

    res.status(200).json(stats);
  }
);
router.get(
  "/api/instructors",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructors = await instructorService.getAllInstructors();
      if (instructors.length === 0) {
        return next(new BadRequestError("No instructors found"));
      }
      res.status(200).json(instructors);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/instructors/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructor = await instructorService.getInstructorById(
        req.params.id
      );
      res.status(200).json(instructor);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return next(new NotFoundError());
      }
      next(error);
    }
  }
);

export { router as instructorRouters };

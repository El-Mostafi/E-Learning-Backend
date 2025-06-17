import { Router, Request, Response, NextFunction } from "express";
import { StudentService } from "../../service/student.service";
import {  BadRequestError, currentUser, NotFoundError, requireAuth } from "../../../common";
import { roleIsStudent } from '../../../common/src/middllewares/validate-roles';
import mongoose from "mongoose";
import { StudentStats } from "./dtos/student.dtos";

const router = Router();
const studentService = new StudentService();

router.get(
  "/api/students/dashboard",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.currentUser!.userId;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return next(new BadRequestError("Invalid student ID"));
    }

    const stats : StudentStats = await studentService.getDashboardStats(
      new mongoose.Types.ObjectId(studentId)
    );

    res.status(200).json(stats);
  }
);

router.get(
  "/api/students",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const students = await studentService.getAllStudents();
      res.status(200).json(students);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/students/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await studentService.getStudentById(req.params.id);
      res.status(200).json(student);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return next(new NotFoundError());
      }
      next(error);
    }
  }
);

export { router as studentRouters };
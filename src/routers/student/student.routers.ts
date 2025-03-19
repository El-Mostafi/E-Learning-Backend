import { Router, Request, Response, NextFunction } from "express";
import { StudentService } from "../../service/student.service";
import {  NotFoundError } from "../../../common";

const router = Router();
const studentService = new StudentService();

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
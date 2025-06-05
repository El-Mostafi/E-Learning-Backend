import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../errors/bad-request-error";
import { NotAutherizedError } from "../errors/not-autherized-error";
import Course from "../../../src/models/course";

export const requireOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const courseId = req.query.courseId;
  if (!courseId) {
    return next(new BadRequestError("Course ID is required"));
  }

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new BadRequestError("Course not found"));
    }
    console.log(req.currentUser?.userId.toString() ,"here",course.instructor.toString());
    if (course.instructor.toString() !== req.currentUser?.userId.toString()) {
      return next(new NotAutherizedError());
    }
    next();
  } catch (error) {
    return next(new NotAutherizedError());
  }
};

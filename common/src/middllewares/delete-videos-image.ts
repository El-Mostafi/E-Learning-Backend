import { Request, Response, NextFunction } from "express";
import cloudinary from "../../../src/routers/cloudinary/cloud.routers";
import { BadRequestError } from "../..";
import Course from "../../../src/models/course";
import { Section, Lecture } from '../../../src/models/course';

export const deleteVideosImageInCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new BadRequestError("Course not found"));
    }
    const publicIds = course.sections.flatMap((section: Section) =>
      section.lectures.map((lecture: Lecture) => lecture.publicId)
    );

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return next(
        new BadRequestError("No videos found to delete")
      );
    }

    const deletePromises = publicIds.map((publicId: string) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "video",
      })
    );

    await Promise.all(deletePromises);

    const imgPublicId = course.imgPublicId;

    if (imgPublicId) {
      await cloudinary.uploader.destroy(imgPublicId, {
        resource_type: "image",
      });
    }

    next();
  } catch (error) {
    console.error("Error deleting videos or Image from Cloudinary:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return next(new BadRequestError(errorMessage));
  }
};

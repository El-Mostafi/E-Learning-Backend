import { Request, Response, NextFunction } from "express";
import cloudinary from "../../../src/routers/cloudinary/cloud.routers";
import { BadRequestError } from "../..";
import Course from "../../../src/models/course";
import { Section, Lecture } from "../../../src/models/course";

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

    // Collect all video publicIds
    const publicIds = course.sections.flatMap((section: Section) =>
      section.lectures.map((lecture: Lecture) => lecture.publicId)
    );

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return next(new BadRequestError("No videos found to delete"));
    }

    // Delete videos one by one, catching individual errors
    const deleteResults = await Promise.all(
      publicIds.map(async (publicId: string) => {
        try {
          const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "video",
          });
          if (result.result === "not found") {
            console.warn(`Video not found on Cloudinary: ${publicId}`);
          }
          return result;
        } catch (err) {
          console.error(`Failed to delete video ${publicId}:`, err);
          return { result: "error", publicId };
        }
      })
    );

    // Optionally log delete results
    // console.log("Video delete results:", deleteResults);

    // Delete image if exists
    const imgPublicId = course.imgPublicId;
    if (imgPublicId) {
      try {
        const imgResult = await cloudinary.uploader.destroy(imgPublicId, {
          resource_type: "image",
        });
        if (imgResult.result === "not found") {
          console.warn(`Image not found on Cloudinary: ${imgPublicId}`);
        }
      } catch (err) {
        console.error(`Failed to delete image ${imgPublicId}:`, err);
      }
    }

    next();
  } catch (error) {
    console.error("Error deleting videos or image from Cloudinary:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return next(new BadRequestError(errorMessage));
  }
};

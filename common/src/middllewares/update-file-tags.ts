import { Request, Response, NextFunction } from "express";
import Course from "../../../src/models/course";
import cloudinary from "../../../src/routers/cloudinary/cloud.routers";
import { BadRequestError } from "../../../common";
export const updateFileTags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const publicIds = req.body;

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return next(
        new BadRequestError("Please provide a non-empty array of publicIds")
      );
    }

    const updatePromises = publicIds.map((publicId) =>
      cloudinary.api.update(publicId, {
        upload_preset: "videos_preset",
        tags: ["published", "remove:temp"],
        resource_type: 'video',
      })
    );

    await Promise.all(updatePromises);

    next();
  } catch (error) {
    console.error("Error updating file tags:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return next(new BadRequestError(errorMessage));
  }
};
// router.post('/publish-course', async (req, res) => {

//   });

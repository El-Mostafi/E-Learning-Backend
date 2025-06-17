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

    const results = await Promise.all(
      publicIds.map(async (publicId) => {
        try {
          await cloudinary.api.update(publicId, {
            upload_preset: "videos_preset",
            tags: ["published"],
            resource_type: "video",
          });
          return { publicId, status: "updated" };
        } catch (err: any) {
          if (err.error.http_code === 404) {
            console.warn(`File not found: ${publicId}`);
            return { publicId, status: "not found" };
          } else {
            console.error(`Error updating ${publicId}:`, err.error.message || err);
            return { publicId, status: "error", error: err.error.message || err };
          }
        }
      })
    );

    // You can optionally send results to client
    next();
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return next(new BadRequestError(errorMessage));
  }
};

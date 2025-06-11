import { Request, Response, NextFunction } from "express";
import cloudinary from "../../../src/routers/cloudinary/cloud.routers";
import { BadRequestError } from "../..";
import User from "../../../src/models/user";

export const deleteImageInCloud = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let userId;
    if (req.currentUser!.role === "admin") {
      userId = req.params.id;
    } else {
      userId = req.currentUser!.userId;
    }
    const user = await User.findById(userId);
    if (!user) {
      return next(
        new BadRequestError("user not found for deleting the image from cloud!")
      );
    }

    const imgPublicId = user.publicId;

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
    console.error("Error deleting Image from Cloudinary:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return next(new BadRequestError(errorMessage));
  }
};

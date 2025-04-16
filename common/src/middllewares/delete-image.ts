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
    const userId = req.currentUser!.userId;
    const user = await User.findById(userId);
    if (!user) {
      return next(new BadRequestError("user not found for deleting the image from cloud!"));
    }

    const imgPublicId = user.publicId;

    if (imgPublicId) {
      const result = await cloudinary.uploader.destroy(imgPublicId, {
        resource_type: "image",
      });
      console.log(result);
    }

    next();
  } catch (error) {
    console.error("Error deleting Image from Cloudinary:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return next(new BadRequestError(errorMessage));
  }
};

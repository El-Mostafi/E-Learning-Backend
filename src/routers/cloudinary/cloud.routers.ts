import { Router, Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import {
  BadRequestError,
  currentUser,
  requireAuth,
  
} from "../../../common";
import {  requireOwnershipOrAdmin } from "../../../common/src/middllewares/require-ownership";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export default cloudinary;
const router = Router();

const getSignature = (
  uploadPreset: string,
  extraParams: Record<string, any> = {}
) => {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, upload_preset: uploadPreset, ...extraParams };
  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET as string
  );
  return { timestamp, signature };
};

router.get(
  "/api/get-signature/image",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (
        !process.env.CLOUDINARY_API_SECRET ||
        !process.env.CLOUDINARY_API_KEY
      ) {
        throw new Error("Cloudinary environment variables are missing.");
      }

      const { timestamp, signature } = getSignature("images_preset");

      res.json({
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/get-signature/video",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (
        !process.env.CLOUDINARY_API_SECRET ||
        !process.env.CLOUDINARY_API_KEY
      ) {
        throw new Error("Cloudinary environment variables are missing.");
      }

      const { timestamp, signature } = getSignature("videos_preset", {
        tags: "temporary,draft",
      });

      res.json({
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
      });
    } catch (error) {
      next(error);
    }
  }
);
router.delete(
  "/api/delete/:type(video|image)/:publicId",
  requireAuth,
  currentUser,
  requireOwnershipOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    const { type, publicId } = req.params;

    if (!publicId || typeof publicId !== "string") {
      return next(new BadRequestError("Invalid public ID."));
    }
    if (!["image", "video"].includes(type)) {
      return next(new BadRequestError("Invalid resource type."));
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: type,
      });

      if (result.result === "ok" || result.result === "not found") {
        res.status(200).json({
          message:
            result.result === "ok"
              ? `${type} deleted successfully.`
              : `${type} already deleted from Cloudinary.`,
        });
        return;
      }

      return next(new BadRequestError(`Failed to delete ${type}.`));
    } catch (error) {
      return next(new BadRequestError("Internal server error."));
    }
  }
);

export { router as cloudRouters };

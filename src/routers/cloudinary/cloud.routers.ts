import { Router, Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import { ISignatureResponse } from "./dtos/cloud.dto";
import { requireAuth } from "../../../common";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export default cloudinary;
const router = Router();

router.get(
  "/api/get-signature/image",
  requireAuth,
  (req: Request, res: Response<ISignatureResponse>, next: NextFunction) => {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: "images_preset" },
      process.env.CLOUDINARY_API_SECRET as string
    );

    res.json({
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY as string,
    });
  }
);
router.get(
  "/api/get-signature/video",
  requireAuth,
  (req: Request, res: Response<ISignatureResponse>, next: NextFunction) => {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: "videos_preset", tags: "temporary,draft" },
      process.env.CLOUDINARY_API_SECRET as string
    );
    // cloudinary.api.delete_resources_by_tag("temporary,draft");
    // cloudinary.v2.uploader.remove_tag('temporary', ['public_id1', 'public_id2']);
    res.json({
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY as string,
    });
  }
);
export { router as cloudRouters };

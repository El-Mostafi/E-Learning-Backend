import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import {
  currentUser,
  requireAuth,
  BadRequestError,
  ValidationRequest,
} from "../../../common";
import { cartService } from "../../service/cart/cart.service";
import mongoose from "mongoose";
const router = Router();

router.post(
  "/cart",
  [body("courseId").not().isEmpty().withMessage("Course ID is required")],
  ValidationRequest,
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await cartService.addToCart(
        new mongoose.Types.ObjectId(req.currentUser!.userId),
        new mongoose.Types.ObjectId(req.body.courseId)
      );

      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }

      res.status(200).json(result.cart);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/cart/:courseId",
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await cartService.removeFromCart(
        new mongoose.Types.ObjectId(req.currentUser!.userId),
        new mongoose.Types.ObjectId(req.params.courseId)
      );
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      const cart = result.cart;
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }
);

// Add routes for getCart and clearCart
export default router;

import { Router, Request, Response, NextFunction } from "express";
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
  "/api/cart/add",
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.body.courseId);
      const cart = await cartService.addToCart(
        new mongoose.Types.ObjectId(req.currentUser!.userId),
        courseId
      );
      res.status(201).json(cart);
    } catch (error) {
      // console.log(error);
      next(error);
    }
  }
);

router.delete(
  "/api/cart/remove",
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.body.courseId);
      const cart = await cartService.removeFromCart(
        new mongoose.Types.ObjectId(req.currentUser!.userId),
        courseId
      );
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/cart",
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.getCart(req.currentUser!.userId);
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/cart/apply-coupon",
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, couponCode } = req.body;
      const cart = await cartService.applyCoupon(
        req.currentUser!.userId,
        courseId,
        couponCode
      );
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/api/cart/clear",
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    try {
      const result = await cartService.clearCart(
        new mongoose.Types.ObjectId(req.currentUser!.userId),
        session
      );
      if(!result.success) {
        return next( new BadRequestError(result.message));
      }
      res.status(200).json(result.message);
    } catch (error) {
      next(error);
    }
  }
);

export { router as cartRouters };

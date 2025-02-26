import { Router, Request, Response, NextFunction } from "express";
import { PaymentIntentRequest } from "./dtos/stripe.dto";
import Stripe from "stripe";
import { BadRequestError,requireAuth } from "../../../common";
import { body } from "express-validator";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});
const router = Router();

router.post(
  "/api/payment-intent",
  requireAuth,
  [
    body("amount").not().isEmpty().withMessage("Please enter an amount"),
    body("currency").not().isEmpty().withMessage("Please enter a currency"),
  ],
  async (
    req: Request<{}, {}, PaymentIntentRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { amount, currency } = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      return next(new BadRequestError((err as Error).message));
    }
  }
);
export { router as stripeRouters };

import express, { Router, Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { BadRequestError, currentUser, requireAuth } from "../../../common";
import { roleIsAdmin, roleIsStudent } from "../../../common/src/middllewares/validate-roles";
import stripeService from "../../service/stripe/stripe.service";



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});
const router = Router();

router.post(
  "/api/payment-intent",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const result = await stripeService.createPaymentIntent(userId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      const paymentIntent = result.paymentIntent!;
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      return next(new BadRequestError((err as Error).message));
    }
  }
);


router.post(
  "/webhook",
  bodyParser.raw({ type: 'application/json' }), // required for Stripe signature verification
  async (req: Request, res: Response) => {
    // console.log("WEBHook")
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("❌ Stripe webhook signature verification failed.", err);
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    try {
      await stripeService.handleStripeWebhook(event);
      res.json({ received: true });
    } catch (err) {
      console.error("❌ Error in Stripe webhook handler:", err);
      res.status(500).send("Webhook processing failed");
    }
  }
);
router.get(
  "/api/admin/revenue-stats",
  requireAuth,
  currentUser,
  roleIsAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await stripeService.getRevenueStats();
      res.status(200).send(stats);
    } catch (err) {
      // Pass any errors to the error-handling middleware
      next(err);
    }
  }
);

export { router as stripeRouters };

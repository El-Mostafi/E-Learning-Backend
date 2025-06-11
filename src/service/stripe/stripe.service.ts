import mongoose from "mongoose";
import { CartService } from "../cart/cart.service";
import Stripe from "stripe";
import { BadRequestError } from "../../../common";
import { EnrollmentService } from "../enrollment/enrollment.service";

const cartService = new CartService();
const enrollmentService = new EnrollmentService();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export class StripeService {
  constructor() {}

   async createPaymentIntent(userId: mongoose.Types.ObjectId) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const cart = await cartService.getCart(userId);

        if (!cart || cart.courses.length === 0) {
          return{success: false, message: "User Not Found or Cart is Empty!"  }  ;
        }

        const amount = Math.round(cart.total * 100);
        const currency = "usd";
        const courseIds = cart.courses.map((c) => c._id);

        // Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency,
          automatic_payment_methods: { enabled: true },
          metadata: {
            userId: userId.toString(),
            courseIds: courseIds.join(","),
          },
        });

        

        return {success: true, paymentIntent: paymentIntent};
      });
    } finally {
      session.endSession();
    }
  }

  async handleStripeWebhook(event: Stripe.Event) {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const userId = paymentIntent.metadata.userId;
      const courseIds = paymentIntent.metadata.courseIds?.split(",");

      if (!userId || !courseIds || courseIds.length === 0) {
        console.warn("⚠️ Missing metadata for userId or courseIds");
        return;
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          for (const courseId of courseIds) {
            const courseObjectId = new mongoose.Types.ObjectId(courseId);
            await enrollmentService.enroll(
              courseObjectId,
              userObjectId,
              session
            );
          }

          // Optionally clear the cart inside the transaction too
          await cartService.clearCart(userObjectId, session);
        });

        console.log(
          `✅ User ${userId} enrolled in courses: ${courseIds.join(", ")}`
        );
      } catch (err) {
        console.error(`❌ Failed to enroll user ${userId}:`, err);
        throw err; // Let Stripe retry
      } finally {
        session.endSession();
      }
    } else {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  }
  async getRevenueStats() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(1); 
    const monthlyRevenue = Array(12).fill(0);

    let totalRevenue = 0;
    const transactions = stripe.balanceTransactions.list({
      type: 'charge', 
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100, 
    });

    for await (const transaction of transactions) {
      const revenueAmount = transaction.amount / 100;
      totalRevenue += revenueAmount;

      const transactionDate = new Date(transaction.created * 1000);
      const monthIndex = transactionDate.getMonth();
      
      monthlyRevenue[monthIndex] += revenueAmount;
    }
    
    const revenueChartSeries = {
      data: monthlyRevenue.map(val => Math.round(val)),
    };

    return {
      totalRevenue: Math.round(totalRevenue), 
      revenueChartSeries,
    };
  }
}

const stripeService = new StripeService();
export default stripeService;

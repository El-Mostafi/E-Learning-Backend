// src/services/cart.service.ts
import { BadRequestError } from "../../../common";
import User from "../../models/user";
import Course from "../../models/course";
import mongoose, { ClientSession } from "mongoose";
import { CartItem } from "../../models/cartItem";
import { disconnect } from "process";

export class CartService {
  async addToCart(
    userId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      // console.log(userId, courseId);
      if (!user) throw new BadRequestError("User not found");
      if (user.role !== "student")
        throw new BadRequestError("Only students can add to cart");

      const course = await Course.findById(courseId).session(session);
      if (!course) throw new BadRequestError("Invalid course ID");
      if (!course.isPublished)
        throw new BadRequestError("Course is not published");

      // Check if course already in cart
      const exists = user.cart.some(
        (item) => item.course.toString() === courseId.toString()
      );
      if (exists) throw new BadRequestError("Course already in cart");

      // Create new cart item with empty coupon
      const newItem = CartItem.build({
        course: courseId,
        appliedCoupon: undefined,
      });

      user.cart.push(newItem);
      await user.save({ session });
      await session.commitTransaction();

      return this.getCart(userId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async removeFromCart(
    userId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) throw new BadRequestError("User not found");

      // Remove item from cart
      const initialLength = user.cart.length;
      user.cart = user.cart.filter(
        (item) => item.course.toString() !== courseId.toString()
      ) as mongoose.Types.DocumentArray<CartItem>;

      if (user.cart.length === initialLength) {
        throw new BadRequestError("Course not found in cart");
      }

      await user.save({ session });
      await session.commitTransaction();

      return this.getCart(userId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getCart(userId: mongoose.Types.ObjectId) {
    const user = (await User.findById(userId)
      .populate({
        path: "cart.course",
        select: "title pricing.price thumbnailPreview coupons",
        model: "Course",
      })
      .select("cart")) as mongoose.Document & {
      _id: mongoose.Types.ObjectId;
      cart: any;
    };

    if (!user) throw new BadRequestError("User not found");

    const cartItems = user.cart.map(
      (item: {
        course: mongoose.Types.ObjectId;
        appliedCoupon: { discountPercentage: number };
      }) => ({
        course: item.course,
        appliedCoupon: item.appliedCoupon,
      })
    );

    const courses = await Promise.all(
      cartItems.map(
        async (item: {
          course: mongoose.Types.ObjectId;
          appliedCoupon: { discountPercentage: number };
        }) => {
          const course = item.course as any;
          const discountedPrice = item.appliedCoupon?.discountPercentage
            ? course.pricing.price *
              (1 - item.appliedCoupon.discountPercentage / 100)
            : course.pricing.price;

          return {
            _id: course._id.toString(),
            title: course.title,
            thumbnailPreview: course.thumbnailPreview,
            price: course.pricing.price,
            appliedCoupon: item.appliedCoupon,
            discountedPrice,
          };
        }
      )
    );

    const subtotal = courses.reduce((sum, c) => sum + c.price, 0);
    const totalDiscount = courses.reduce(
      (sum, c) => sum + (c.price - c.discountedPrice),
      0
    );
    const total = subtotal - totalDiscount;

    return {
      userId: user._id.toString(),
      courses,
      subtotal,
      totalDiscount,
      total,
    };
  }

  async applyCoupon(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    couponCode: string
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) throw new BadRequestError("User not found");

      const course = await Course.findById(courseId).session(session);
      if (!course) throw new BadRequestError("Course not found");

      // Find cart item
      const cartItem = user.cart.find(
        (item) => item.course.toString() === courseId
      );
      if (!cartItem) throw new BadRequestError("Course not in cart");

      // Find coupon in course
      const coupon = course.coupons.find((c) => c.code === couponCode);
      if (!coupon) throw new BadRequestError("Invalid coupon for this course");
      if (coupon.expiryDate < new Date())
        throw new BadRequestError("Coupon expired");
      if (coupon.maxUses <= 0) throw new BadRequestError("Coupon exhausted");

      // Atomic update of coupon maxUses
      const updateResult = await Course.updateOne(
        {
          _id: courseId,
          "coupons.code": couponCode,
          "coupons.maxUses": { $gt: 0 },
        },
        { $inc: { "coupons.$.maxUses": -1 } }
      ).session(session);

      if (updateResult.modifiedCount === 0) {
        throw new BadRequestError("Coupon no longer available");
      }

      // Update cart item
      cartItem.appliedCoupon = {
        code: couponCode,
        discountPercentage: coupon.discountPercentage,
      };

      await user.save({ session });
      await session.commitTransaction();

      return this.getCart(userId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async clearCart(userId: mongoose.Types.ObjectId, session: ClientSession) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { cart: [] } },
      { new: true, session }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }
    return { success: true, message: "Cart cleared successfully" };
  }
}

export const cartService = new CartService();

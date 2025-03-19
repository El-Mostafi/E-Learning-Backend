// src/services/cart.service.ts
import { BadRequestError } from "../../../common";
import  User from "../../models/user";
import Course  from "../../models/course";
import mongoose from "mongoose";

export class CartService {
  async addToCart(
    userId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ) {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: "User not found" };
    if (user.role !== "student") return { success: false, message: "Only students can add to cart" }; 

    const course = await Course.findById(courseId);
    if (!course) return { success: false, message: "Invalid course ID" };
    if (!course.isPublished) return { success: false, message: "Course is not available" };

    if (user.cart.includes(courseId)) {
        return { success: false, message: "Course already in cart" };
    }

    user.cart.push(courseId);
    await user.save();
    return { success: true, cart: user.cart };
  }

  async removeFromCart(
    userId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ) {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: "User not found" };
  
    // Convert to Mongoose Array instance
    const cartArray = user.cart as mongoose.Types.Array<mongoose.Types.ObjectId>;
    
    const initialLength = cartArray.length;
    cartArray.pull(courseId);
    
    if (cartArray.length === initialLength) {
      return { success: false, message: "Course not found in cart" };
    }
  
    await user.save();
    return { success: true, cart: cartArray };
  }

  async getCart(userId: mongoose.Types.ObjectId) {
    const user = await User.findById(userId)
      .populate("cart", "title price coverImg")
      .select("cart");
      
    if (!user) throw new BadRequestError("User not found");
    return user.cart;
  }

  async clearCart(userId: mongoose.Types.ObjectId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { cart: [] } },
      { new: true }
    );
    
    if (!user) throw new BadRequestError("User not found");
    return user.cart;
  }
}

export const cartService = new CartService();
import mongoose from "mongoose";

export interface CartItem extends mongoose.Document {
  course: mongoose.Types.ObjectId;
  appliedCoupon?: {
    code: string;
    discountPercentage: number;
  };
}

export interface CartItemModel extends mongoose.Model<CartItem> {
  build(attrs: {
    course: mongoose.Types.ObjectId;
    appliedCoupon?: { code: string; discountPercentage: number };
  }): CartItem;
}

export const cartItemSchema = new mongoose.Schema<CartItem>(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    appliedCoupon: {
      code: {
        type: String,
        required: false,
      },
      discountPercentage: {
        type: Number,
        required: false,
      },
    },
  },
  { timestamps: true }
);

// Add the `build` method to the schema
cartItemSchema.statics.build = (attrs: {
  course: mongoose.Types.ObjectId;
  appliedCoupon?: { code: string; discountPercentage: number };
}) => {
  return new CartItem(attrs);
};

export const CartItem = mongoose.model<CartItem, CartItemModel>(
  "CartItem",
  cartItemSchema
);

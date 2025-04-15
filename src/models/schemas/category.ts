import mongoose from "mongoose";

export interface Category extends mongoose.Document {
  name: string;
}

const categorySchema = new mongoose.Schema<Category>({
  name: {
    type: String,
    required: true,
  },
});

export default categorySchema;

import mongoose from "mongoose";

export interface Category extends mongoose.Document {
    name: string;
    description: string;
}

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
});

export default categorySchema;
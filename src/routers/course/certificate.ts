import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
  courseTitle: {
    type: String,
    required: true,
  },
  instructorName: String,
  student:{
    type: mongoose.Types.ObjectId,
    ref: "User"
  },
  dateIssued: {
    type: Date,
    default: Date.now,
  },
  url: {
    type: String,
    required: true,
  },
});

export default certificateSchema;
import mongoose from "mongoose";

export interface Certificate extends mongoose.Document {
    courseTitle: string;
    instructorName: string;
    student: mongoose.Schema.Types.ObjectId;
    dateIssued: Date;
    url: string;
}


const certificateSchema = new mongoose.Schema<Certificate>({
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
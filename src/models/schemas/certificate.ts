import mongoose from "mongoose";

export interface CertificateDocument extends mongoose.Document {
  course: mongoose.Types.ObjectId;
  courseTitle: string;
  instructorName: string;
  student: mongoose.Types.ObjectId;
  dateIssued: Date;
  url?: string;
}

export interface CertificateModel extends mongoose.Model<CertificateDocument> {
  build(certificate: {
    course: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    courseTitle: string;
    instructorName: string;
    dateIssued: Date;
    url?: string;
  }): CertificateDocument;
}

const certificateSchema = new mongoose.Schema<CertificateDocument>({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  },

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  courseTitle: {
    type: String,
    required: true,
  },

  instructorName: String,

  dateIssued: {
    type: Date,
    default: Date.now,
  },
  url: {
    type: String,
    // required: true,
  },
});

certificateSchema.statics.build = (certificate: CertificateDocument) => {
  return new Certificate(certificate);
};

export const Certificate = mongoose.model<
  CertificateDocument,
  CertificateModel
>("Certificate", certificateSchema);

export default certificateSchema;

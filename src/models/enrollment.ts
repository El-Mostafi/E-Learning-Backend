import mongoose from "mongoose";

export interface Enrollment extends mongoose.Document {
  course: mongoose.Types.ObjectId;
  participant: mongoose.Types.ObjectId;
  progress: number;
  completed: boolean;
  completedAt: Date | null;
  startedAt: Date;
}

export interface EnrollmentModel extends mongoose.Model<Enrollment> {
  build(enrollment: {
    course: mongoose.Types.ObjectId;
    participant: mongoose.Types.ObjectId;
  }): Enrollment;
}

const enrollmentSchema = new mongoose.Schema<Enrollment>({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  progress: {
    type: Number,
    default: 0,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
});

enrollmentSchema.statics.build = (enrollment: {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}) => {
  return new Enrollment(enrollment);
};

const Enrollment = mongoose.model<Enrollment, EnrollmentModel>("Enrollment", enrollmentSchema);
export default Enrollment;

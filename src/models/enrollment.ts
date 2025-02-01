import mongoose from "mongoose";

export interface Enrollment extends mongoose.Document {
    courseId: string;
    userId: string;
    progress: number;
    completed: boolean;
    completedAt: Date;
    startedAt: Date;
}

export interface EnrollmentModel extends mongoose.Model<Enrollment> {
    build(enrollment: Enrollment): Enrollment;
}

const enrollmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  userId: {
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

enrollmentSchema.statics.build = (enrollment: Enrollment) => {
  return new Enrollment(enrollment);
};

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
export default Enrollment;
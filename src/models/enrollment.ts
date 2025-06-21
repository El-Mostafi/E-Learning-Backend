import mongoose from "mongoose";

export interface completedSection {
  sectionId: mongoose.Types.ObjectId;
  lectureId: mongoose.Types.ObjectId;
  completedAt: Date;
}

export interface EnrollmentDocument extends mongoose.Document {
  course: mongoose.Types.ObjectId;
  participant: mongoose.Types.ObjectId;
  completedSections: completedSection[];
  progress: number;
  completed: boolean;
  completedAt: Date | null;
  startedAt: Date;
  hasPassedQuizze: boolean;
  QuizzeScore: number;
}

export interface EnrollmentModel extends mongoose.Model<EnrollmentDocument> {
  build(enrollment: {
    course: mongoose.Types.ObjectId;
    participant: mongoose.Types.ObjectId;
  }): EnrollmentDocument;
}

const enrollmentSchema = new mongoose.Schema<EnrollmentDocument>({
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
  completedSections: [
    {
      sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
        required: true,
      },
      lectureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture",
        required: true,
      },
      completedAt: {
        type: Date,
        default: null,
      },
    },
  ],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
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
  hasPassedQuizze: {
    type: Boolean,
    default: false,
  },
  QuizzeScore: {
    type: Number,
    default: 0,
  },
});

enrollmentSchema.statics.build = (enrollment: {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}) => {
  return new Enrollment(enrollment);
};

const Enrollment = mongoose.model<EnrollmentDocument, EnrollmentModel>(
  "Enrollment",
  enrollmentSchema
);
export default Enrollment;

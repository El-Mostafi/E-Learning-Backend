import mongoose from "mongoose";
import reviewSchema, { Review } from "./schemas/review";
import certificateSchema, { Certificate } from "./schemas/certificate";
import categorySchema, { Category } from "./schemas/category";
import { CourseDto } from "../routers/course/dtos/course.dto";

export enum Level {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
}

export enum Language {
  Arabic = "Arabic",
  English = "English",
  Spanish = "Spanish",
  French = "French",
  German = "German",
  Italian = "Italian",
}

interface Lecture extends mongoose.Document {
  title: string;
  duration: number;
  videoUrl: string;
  thumbnailUrl: string;
}

interface Section extends mongoose.Document {
  title: string;
  orderIndex: number;
  isPreview: boolean;
  lectures: mongoose.Types.DocumentArray<Lecture>;
}

interface Exam extends mongoose.Document {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

const lectureSchema = new mongoose.Schema<Lecture>({
  title: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  videoUrl: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required: true,
  },
});

const SectionSchema = new mongoose.Schema<Section>({
  title: {
    type: String,
    required: true,
  },
  orderIndex: {
    type: Number,
    required: true,
  },
  isPreview: {
    type: Boolean,
    required: true,
  },
  lectures: [lectureSchema],
});

const examSchema = new mongoose.Schema<Exam>({
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
  },
});

interface CourseDocument extends mongoose.Document {
  title: string;
  description: string;
  coverImg: string;
  level: string;
  language: string;
  price: number;
  oldPrice?: number;
  category: Category;
  reviews: mongoose.Types.DocumentArray<Review>;
  sections: mongoose.Types.DocumentArray<Section>;
  certificates: mongoose.Types.DocumentArray<Certificate>;
  exam: Exam;
  instructor: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  isPublished: boolean;
}

interface CourseModel extends mongoose.Model<CourseDocument> {
  build(courseDto: CourseDto): CourseDocument;
}

const courseSchema = new mongoose.Schema<CourseDocument>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },

    coverImg: {
      type: String,
      required: true,
    },

    level: {
      type: String,
      enum: Object.values(Level),
      required: false,
    },

    language: {
      type: String,
      enum: Object.values(Language),
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    oldPrice: {
      type: Number,
      required: false,
    },

    category: categorySchema,

    reviews: [reviewSchema],
    sections: [SectionSchema],
    certificates: [certificateSchema],

    exam: examSchema,

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isPublished: {
      type: Boolean,
      default: false,
    },
  },

  { timestamps: true }
);

courseSchema.statics.build = (courseDto: CourseDto) => {
  return new Course(courseDto);
};

const Course = mongoose.model<CourseDocument, CourseModel>(
  "Course",
  courseSchema
);
export default Course;

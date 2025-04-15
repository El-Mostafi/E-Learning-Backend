import mongoose from "mongoose";
import reviewSchema, { Review } from "./schemas/review";
import certificateSchema, { Certificate } from "./schemas/certificate";
import categorySchema, { Category } from "./schemas/category";
import { CoursDtoParent } from "../routers/course/dtos/course.dto";

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
  description: string;
  duration: number;
  videoUrl: string;
  publicId: string;
  isPreview: boolean;
}

interface Section extends mongoose.Document {
  title: string;
  description: string;
  orderIndex: number;
  isPreview: boolean;
  lectures: mongoose.Types.DocumentArray<Lecture>;
}

// interface Exam extends mongoose.Document {
//   question: string;
//   options: {
//     A: string;
//     B: string;
//     C: string;
//     D: string;
//   };
//   correctAnswer: "A" | "B" | "C" | "D";
// }
interface Exam extends mongoose.Types.Subdocument {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
}

const lectureSchema = new mongoose.Schema<Lecture>({
  title: {
    type: String,
    required: true,
  },
  description: {
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
  publicId: {
    type: String,
    required: true,
  },
  isPreview: {
    type: Boolean,
    required: true,
  },
});

const SectionSchema = new mongoose.Schema<Section>({
  title: {
    type: String,
    required: true,
  },
  description: {
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

const examSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true },
  },
  correctAnswer: {
    type: String,
    enum: ["A", "B", "C", "D"],
    required: true,
  },
});

interface CourseDocument extends mongoose.Document {
  title: string;
  description: string;
  thumbnailPreview: string;
  level: string;
  language: string;
  pricing: {
    price: number;
    isFree: boolean;
  };
  oldPrice?: number;
  category: Category;
  reviews: mongoose.Types.DocumentArray<Review>;
  sections: mongoose.Types.DocumentArray<Section>;
  certificates: mongoose.Types.DocumentArray<Certificate>;
  quizQuestions: mongoose.Types.DocumentArray<Exam>;
  instructor: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  isPublished: boolean;
}

interface CourseModel extends mongoose.Model<CourseDocument> {
  build(courseDto: CoursDtoParent): CourseDocument;
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

    thumbnailPreview: {
      type: String,
      required: true,
    },

    level: {
      type: String,
      enum: Object.values(Level),
      required: true,
    },

    language: {
      type: String,
      enum: Object.values(Language),
      required: true,
    },

    pricing: {
      price: {
        type: Number,
        required: true,
      },
      isFree: {
        type: Boolean,
        required: true,
      },
    },

    oldPrice: {
      type: Number,
      required: false,
    },

    category: categorySchema,

    reviews: [reviewSchema],
    sections: [SectionSchema],
    certificates: [certificateSchema],

    quizQuestions: {
      type: [examSchema],
      default: [],
    },

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

courseSchema.statics.build = (courseDto: CoursDtoParent) => {
  return new Course(courseDto);
};

const Course = mongoose.model<CourseDocument, CourseModel>(
  "Course",
  courseSchema
);
export default Course;

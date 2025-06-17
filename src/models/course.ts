import mongoose from "mongoose";
import reviewSchema, { Review } from "./schemas/review";
import certificateSchema, { CertificateDocument } from "./schemas/certificate";
import categorySchema, { Category } from "./schemas/category";
import { CourseDto } from "../routers/course/dtos/course.dto";

export enum Level {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
  All_Levels = "All Levels",
}

export enum Language {
  Arabic = "Arabic",
  English = "English",
  Spanish = "Spanish",
  French = "French",
  German = "German",
  Italian = "Italian",
  Chinese = "Chinese",
}

export interface Lecture extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  publicId: string;
  isPreview: boolean;
}

export interface Section extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  orderIndex: number;
  isPreview: boolean;
  lectures: mongoose.Types.DocumentArray<Lecture>;
}


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

interface Coupon extends mongoose.Types.Subdocument {
  code: string;
  discountPercentage: number;
  maxUses: number;
  expiryDate: Date;
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

const examSchema = new mongoose.Schema<Exam>({
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

const couponSchema = new mongoose.Schema<Coupon>({
  code: {
    type: String,
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
  },
  maxUses: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
});

  export interface CourseDocument extends mongoose.Document {
    title: string;
    description: string;
    thumbnailPreview: string;
    imgPublicId: string;
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
    certificates: mongoose.Types.DocumentArray<CertificateDocument>;
    quizQuestions: mongoose.Types.DocumentArray<Exam>;
    coupons: mongoose.Types.DocumentArray<Coupon>;
    instructor: mongoose.Types.ObjectId;
    students: mongoose.Types.ObjectId[];
    isPublished: boolean;
    createdAt: Date;
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

    thumbnailPreview: {
      type: String,
      required: true,
    },

    imgPublicId: {
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

    coupons: {
      type: [couponSchema],
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

    createdAt: {
      type: Date,
      default: Date.now,
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

import mongoose from "mongoose";
import reviewSchema from "../routers/course/review";
import certificateSchema from "../routers/course/certificate";
import categorySchema from "../routers/course/category";
import { CourseDto } from "src/routers/course/dtos/course.dto";

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


const lectureSchema = new mongoose.Schema({
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

const SectionSchema = new mongoose.Schema({
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

const examSchema = new mongoose.Schema({
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
  category: {
    name: string;
    description: string;
  };
  reviews: {
    userId: string;
    userName: string;
    review: string;
    rating: number;
    createdAt: Date;
  }[];
  sections: {
    title: string;
    orderIndex: number;
    isPreview: boolean;
    lectures: {
      title: string;
      duration: number;
      videoUrl: string;
      thumbnailUrl: string;
    }[];
  }[];
  certificates: {
    courseTitle: string;
    instructorName: string;
    student: mongoose.Schema.Types.ObjectId;    
    dateIssued: Date;
    url: string;
  }[] | null;
  exam: {
    question: string;
    options: string[];
    correctAnswerIndex: number;
  } | null;
  instructor: mongoose.Schema.Types.ObjectId;
  students: mongoose.Schema.Types.ObjectId[];
  isPublished: boolean;
}

interface CourseModel extends mongoose.Model<CourseDocument> {
  build(courseDto: CourseDto): CourseDocument;
}

const courseSchema = new mongoose.Schema(
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
    }
  },

  { timestamps: true }
);

courseSchema.statics.build = (courseDto: CourseDto) => {
  return new Course(courseDto);
}

const Course = mongoose.model<CourseDocument, CourseModel>("Course", courseSchema);
export default Course;

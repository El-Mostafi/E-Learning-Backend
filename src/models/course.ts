import mongoose from "mongoose";

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

const reviewSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


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

const certificateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
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

    imageUrl: {
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

    category: {
      type: new mongoose.Schema({
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: false,
        },
      }),
    },

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
  },

  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;

import mongoose from "mongoose";
import { AuthenticationService } from "../../common";
import { BadRequestError } from "../../common";
import reviewSchema, { Review } from "./schemas/review";
import certificateSchema, { CertificateDocument } from "./schemas/certificate";
import { CartItem, cartItemSchema } from "./cartItem";
export type UserRole = "admin" | "instructor" | "student";

export interface UserDocument extends mongoose.Document {
  email: string;
  password: string;
  userName: string;
  role: UserRole;
  emailConfirmed: boolean;
  profileImg: string;
  publicId: string;
  createdAt: Date;
  // Student-specific fields
  educationLevel?: string;
  fieldOfStudy?: string;
  // Instructor-specific fields
  expertise?: string;
  yearsOfExperience?: number;
  biography?: string;

  status: "active" | "blocked";
  lastLogin: Date | null;

  socialLinks: {
    github: string;
    linkedin: string;
    twitter: string;
    portfolio: string;
  };

  enrollments: mongoose.Types.ObjectId[];
  reviews: mongoose.Types.DocumentArray<Review>;
  certificates: mongoose.Types.DocumentArray<CertificateDocument>;
  cart: mongoose.Types.Array<CartItem>;
}

export interface CreateUserDto {
  email: string;
  password: string;
  userName: string;
  role: UserRole;
  // Student fields
  educationLevel?: string;
  fieldOfStudy?: string;
  // Instructor fields
  expertise?: string;
  yearsOfExperience?: number;
  biography?: string;
}

export interface UserModel extends mongoose.Model<UserDocument> {
  build(createUserDto: CreateUserDto): UserDocument;
}

const userSchema = new mongoose.Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ["admin", "instructor", "student"],
    required: true,
    default: "student",
  },
  emailConfirmed: {
    type: Boolean,
    default: false,
  },
  profileImg: {
    type: String,
    default:
      "https://res.cloudinary.com/dkqkxtwuf/image/upload/v1740161005/defaultAvatar_iotzd9.avif",
  },
  publicId: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Student-specific fields
  educationLevel: {
    type: String,
    enum: [
      "high_school",
      "associate",
      "bachelor",
      "master",
      "doctorate",
      "other",
    ],
    default: null,
  },
  fieldOfStudy: {
    type: String,
    default: null,
    trim: true,
  },
  // Instructor-specific fields
  expertise: {
    type: String,
    default: null,
    trim: true,
  },
  yearsOfExperience: {
    type: Number,
    default: null,
    min: 0,
  },
  biography: {
    type: String,
    default: null,
    trim: true,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ["active", "blocked"],
    default: "active",
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  socialLinks: {
    github: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    portfolio: { type: String, default: "" },
  },

  // Fields related to courses
  enrollments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
    },
  ],
  // Fields related to reviews
  reviews: [reviewSchema],
  // Fields related to certificates

  certificates: [certificateSchema],
  cart: [cartItemSchema],
});

userSchema.pre("save", async function (next) {
  const authenticationService = new AuthenticationService();

  if (this.isModified("password") || this.isNew) {
    const hashedPassword = await authenticationService.pwdToHash(
      this.get("password")
    );
    this.set("password", hashedPassword);
  }

  if (this.role === "student") {
    if (!this.educationLevel || !this.fieldOfStudy) {
      return next(
        new BadRequestError(
          "Education level and field of study are required for students"
        )
      );
    }
  }

  if (this.role === "instructor") {
    if (!this.expertise || !this.yearsOfExperience || !this.biography) {
      return next(
        new BadRequestError(
          "Expertise, years of experience, and biography are required for instructors"
        )
      );
    }
  }

  next();
});

userSchema.statics.build = (createUserDto: CreateUserDto) => {
  return new User(createUserDto);
};

const User = mongoose.model<UserDocument, UserModel>("User", userSchema);
export default User;

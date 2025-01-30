import mongoose from "mongoose";

export interface UserOTPVerificationDocument extends mongoose.Document {
    email: string;
    otp: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface CreateUserOTPVerificationDto {
    email: string;
    otp: string;
    expiresAt: Date;
}

export interface UserOTPVerificationModel extends mongoose.Model<UserOTPVerificationDocument> {
    build(createUserOTPVerificationDto: CreateUserOTPVerificationDto): UserOTPVerificationDocument;
}

const userOTPVerificationSchema = new mongoose.Schema<UserOTPVerificationDocument>(
    {
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
);

userOTPVerificationSchema.statics.build = (createUserOTPVerificationDto: CreateUserOTPVerificationDto) => {
    return new UserOTPVerification(createUserOTPVerificationDto);
};

const UserOTPVerification = mongoose.model<UserOTPVerificationDocument, UserOTPVerificationModel>(
    "UserOTPVerification",
    userOTPVerificationSchema
);

export default UserOTPVerification;

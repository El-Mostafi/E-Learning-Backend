import mongoose from "mongoose";
import { AuthenticationService } from "../../common";
import reviewSchema, { Review } from "./schemas/review";
import certificateSchema from "./schemas/certificate";

export interface UserDocument extends mongoose.Document {
    email: string;
    password: string;
    userName: string;
    emailConfirmed: boolean;
    profileImg: string;
    coverImg: string;
    createdAt: Date;
    AboutMe:string;
    enrollments: mongoose.Schema.Types.ObjectId[];
    reviews: Review[];
    certificates: [];

}

export interface createUserDto {
    email: string;
    password: string;
    userName: string;
    AboutMe?: string; // Optional
}

export interface UserModel extends mongoose.Model<UserDocument> {
    build(createUserDto: createUserDto): UserDocument
}

const userSchema = new mongoose.Schema<UserDocument>({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true,
        unique: true
    },
    emailConfirmed: {
        type: Boolean,
        default: false
    },
    profileImg: {
        type: String,
        default: null
    },
    coverImg: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    AboutMe:{
        type:String,
        default: null
    },
    // Fields related to courses
    enrollments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Enrollment'
        }
    ],
    // Fields related to reviews
    reviews: [reviewSchema],
    // Fields related to certificates
    certificates: [certificateSchema]

});
userSchema.pre('save', async function(done){
    const authenticationService = new AuthenticationService()
    if(this.isModified('password') || this.isNew){ 
        const HashedPassword =await authenticationService.pwdToHash(this.get('password'));
        this.set('password', HashedPassword);
    }
    done();
});

userSchema.statics.build = (createUserDto: createUserDto) => {
    return new User(createUserDto);
}

const User = mongoose.model<UserDocument, UserModel>('User', userSchema);
export default User;
import UserOTPVerification  from '../models/userOTPVerification'
import { AuthDto } from '../routers/auth/dtos/auth.dto'

export class UserOTPVerificationService {
    constructor(
    ) {}

    async create(email: string, otp: string) {
        const userOTPVerification = await UserOTPVerification.build({
            email,
            otp,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

        return await userOTPVerification.save()
    }

    async findOneByEmail(email: string) {
        return await UserOTPVerification.findOne({
            email
        });
    }
    generateOtp ():string {
        return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
    };

}

export const userOTPVerificationService = new UserOTPVerificationService()
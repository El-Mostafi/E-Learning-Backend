import { UserService,userService } from '../../service/user.service'
import { emailSenderService } from '../../service/EmailSender.service'
import { userOTPVerificationService } from '../../service/userOTPVerification.service'
import { AuthDto } from './dtos/auth.dto'
import {  AuthenticationService } from "../../../common"
import UserOTPVerification from '../../models/userOTPVerification';

export class AuthService {
    constructor(
        public userService: UserService,
        public authenticationService: AuthenticationService
    ) {}

    async signup(createUserDto: AuthDto ) {
        const existingUser = await this.userService.findOneByEmailOrUserName(createUserDto.email , createUserDto.userName)
        if(existingUser) return { message: "email or user name is taken"  }

        
        const newUser = await this.userService.create(createUserDto);
        
        const jwt = this.authenticationService.generateJwt({ email: createUserDto.email, userId: newUser.id , userName: createUserDto.userName, emailConfirmed: false}, process.env.JWT_KEY!);
        
        return {jwt,newUser};
    }

    async signin(signinDto: AuthDto) {
        const user = await this.userService.findOneByEmailOrUserName(signinDto.email,signinDto.userName);
        if(!user) return { message: "wrong credentials" }

        const samePwd = this.authenticationService.pwdCompare(user.password, signinDto.password);

        if(!samePwd) return { message: "wrong credentials" }
        if(user.emailConfirmed == false) return { message: "Email is not confirmed" }
        const jwt = this.authenticationService.generateJwt({ email: user.email, userId: user.id, userName: user.userName, emailConfirmed: user.emailConfirmed }, process.env.JWT_KEY!);        
        
        return {jwt,user};
    }
    async sendOtpVerificationEmail(email: string, userName: string) {
        const otp=userOTPVerificationService.generateOtp();
        const hashOtp = await this.authenticationService.pwdToHash(otp);
        await userOTPVerificationService.create(email,hashOtp);
        const subject ="Verification email";
        const htmlContent = `
<html>
<head>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f7fc;
            margin: 0;
            padding: 0;
            width: 100%;
        }
        .container {
            width: 100%;
            padding: 30px;
            background: #ffffff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-bottom: 5px solid #1a73e8;
        }
        .header {
            font-size: 24px;
            font-weight: bold;
            color: #1a73e8;
            margin-bottom: 15px;
        }
        .description {
            font-size: 16px;
            color: #555;
            margin-bottom: 20px;
        }
        .otp-code {
            display: inline-block;
            padding: 12px 20px;
            font-size: 22px;
            font-weight: bold;
            color: #1a73e8;
            background-color: #f0f7ff;
            border: 2px dashed #1a73e8;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #888;
            padding: 20px;
            background: #f4f7fc;
            text-align: center;
        }
        .footer a {
            color: #1a73e8;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>Hello {userName},</div>
        <div class='description'>Thank you for verifying your email address. Please use the OTP code below:</div>
        <div class='otp-code'>{otp}</div>
        <div class='description'>This code will expire in 30 minutes. If you didn’t request this code, please ignore this email.</div>
    </div>
    <div class='footer'>
        <p>Need help? Contact our support team at <a href="mailto:support@example.com">support@example.com</a>.</p>
    </div>
</body>
</html>
`
.replace("{userName}", userName)
.replace("{otp}", otp);


        await emailSenderService.sendEmail(email,subject,htmlContent);
    }

    async verifyEmail(email: string, otp: string) {
        const userOTPVerification = await userOTPVerificationService.findOneByEmail(email);
        if (!userOTPVerification) {
            return { message: "Account record not found or has been verified already. Please sign up or login" };
        }
        
        const isOtpValid = await this.authenticationService.pwdCompare(userOTPVerification.otp, otp);
        
        if(!isOtpValid) return { message: "Invalid code passed. check your email" }

        if (userOTPVerification.expiresAt < new Date()) {
            await UserOTPVerification.deleteMany({ email });

            return { message: "OTP expired" };
        }
        // Delete the OTP record after successful verification
        await UserOTPVerification.deleteMany({ email });

    
        return { success: "Email verified successfully" };
    }
    async verifyUser(email: string,userName: string) {
        const user = await this.userService.findOneByEmailOrUserName(email,userName);
        if (user) {
            user.emailConfirmed = true;
            await user.save();
        const jwt = this.authenticationService.generateJwt({ email: user.email, userId: user.id, userName: user.userName, emailConfirmed: user.emailConfirmed }, process.env.JWT_KEY!);        
            return {user,jwt};
        }
        else {
            return { message: "User not found" };
        }
    }
    async RequestResetEmail(email: string){
        const user = await userService.findOneByEmail(email);
        if (!user) return {message: "User not found"};

        const otp=userOTPVerificationService.generateOtp();
        const hashOtp = await this.authenticationService.pwdToHash(otp);
        await userOTPVerificationService.create(email,hashOtp);
        const subject ="Reset password";
        const htmlContent = `
<html>
<head>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f7fc;
            margin: 0;
            padding: 0;
            width: 100%;
        }
        .container {
            width: 100%;
            padding: 30px;
            background: #ffffff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-bottom: 5px solid #1a73e8;
        }
        .header {
            font-size: 24px;
            font-weight: bold;
            color: #1a73e8;
            margin-bottom: 15px;
        }
        .description {
            font-size: 16px;
            color: #555;
            margin-bottom: 20px;
        }
        .otp-code {
            display: inline-block;
            padding: 12px 20px;
            font-size: 22px;
            font-weight: bold;
            color: #1a73e8;
            background-color: #f0f7ff;
            border: 2px dashed #1a73e8;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #888;
            padding: 20px;
            background: #f4f7fc;
            text-align: center;
        }
        .footer a {
            color: #1a73e8;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>Hello {userName},</div>
        <div class='description'>You recently requested to reset your password. Please use the OTP code below to proceed:</div>
        <div class='otp-code'>{otp}</div>
        <div class='description'>This OTP is valid for 30 minutes. If you did not request this change, please ignore this email.</div>
    </div>
    <div class='footer'>
        <p>If you need assistance, contact our support team at <a href="mailto:support@example.com">support@example.com</a>.</p>
    </div>
</body>
</html>
`
.replace("{userName}", user.userName)
.replace("{otp}", otp);


        await emailSenderService.sendEmail(email,subject,htmlContent);

        return {success: "Email sent successfully"}
    }
    async ResetPassword(email: string, otp: string,newPassword: string){ {
        const userOTPVerification = await userOTPVerificationService.findOneByEmail(email);
        if (!userOTPVerification) {
            return {success:false, message: "Account record not found for this email." };
        }
        
        const isOtpValid = await this.authenticationService.pwdCompare(userOTPVerification.otp, otp);
        if(!isOtpValid) return {success:false, message: "Invalid code passed. check your email" }

        if (userOTPVerification.expiresAt < new Date()) {
            await UserOTPVerification.deleteMany({ email });

            return {success:false, message: "OTP expired" };
        }

        // Update user password
        const hashedPassword = await this.authenticationService.pwdToHash(newPassword);
        const result = await userService.updatePassword(email, hashedPassword);

        if (!result.success) return { success:false, message: result.message as string };
        // Delete the OTP record after successful verification
        await UserOTPVerification.deleteMany({ email });

    
        return { success:true, message:result.message as string };
    }
}
}
export const authService = new AuthService(userService, new AuthenticationService())

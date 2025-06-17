import { UserService, userService } from "../../service/user.service";
import { emailSenderService } from "../../service/EmailSender.service";
import { userOTPVerificationService } from "../../service/userOTPVerification.service";
import { AuthDto, CreateUserDto, updateData } from "./dtos/auth.dto";
import { AuthenticationService } from "../../../common";
import UserOTPVerification from "../../models/userOTPVerification";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export class AuthService {
  constructor(
    public userService: UserService,
    public authenticationService: AuthenticationService
  ) {}

  async signup(createUserDto: CreateUserDto) {
    const existingUser = await this.userService.findOneByEmailOrUserName(
      createUserDto.email,
      createUserDto.userName
    );

    if (existingUser) {
      return { message: "Email or username is already taken" };
    }

    const userData = {
      email: createUserDto.email,
      password: createUserDto.password,
      userName: createUserDto.userName,
      role: createUserDto.role,
      RememberMe: false,
      ...(createUserDto.role === "student" && {
        educationLevel: createUserDto.educationLevel,
        fieldOfStudy: createUserDto.fieldOfStudy,
      }),
      ...(createUserDto.role === "instructor" && {
        expertise: createUserDto.expertise,
        yearsOfExperience: createUserDto.yearsOfExperience,
        biography: createUserDto.biography,
      }),
    };

    const newUser = await this.userService.create(userData);
    return { newUser };
  }

  async signin(signinDto: AuthDto) {
    const user = await this.userService.findOneByEmailOrUserName(
      signinDto.email,
      signinDto.userName
    );

    if (!user) return { message: "wrong credentials" };
    if (user.emailConfirmed == false)
      return { message: "Email is not confirmed" };
    const samePwd = await this.authenticationService.pwdCompare(
      user.password,
      signinDto.password
    );
    // console.log(samePwd);

    if (!samePwd) return { message: "wrong credentials" };
    if(user.status == "blocked") return { message: "Your account is blocked" };
    user.lastLogin = new Date();
    await user.save();
    const jwt = this.authenticationService.generateJwt(
      {
        email: user.email,
        userId: user.id,
        userName: user.userName,
        emailConfirmed: user.emailConfirmed,
        profileImg: user.profileImg,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        expertise: user.expertise,
        yearsOfExperience: user.yearsOfExperience,
        biography: user.biography,
        educationLevel: user.educationLevel,
        fieldOfStudy: user.fieldOfStudy,
      },
      process.env.JWT_KEY!,
      signinDto.RememberMe
    );

    return { jwt, user };
  }
  async sendOtpVerificationEmail(email: string) {
    const user = await userService.findOneByEmail(email);
    if (!user) return { message: "User not found" };
    const userName = user.userName;
    const otp = userOTPVerificationService.generateOtp();
    const hashOtp = await this.authenticationService.pwdToHash(otp);
    await userOTPVerificationService.create(email, hashOtp);
    const subject = "Verification email";
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
        <div class='header'>Hello, {userName} ! &#128075</div>
        <div class='description'>Thank you for verifying your email address. Please use the OTP code below:</div>
        <div class='otp-code'>{otp}</div>
        <div class='description'>This code will expire in 30 minutes. If you didn’t request this code, please ignore this email.</div>
    </div>
    <div class='footer'>
        <p>Need help? Contact our support team at <a href="mailto:helpdesk.elearningapp@gmail.com">helpdesk.elearningapp@gmail.com</a>.</p>
    </div>
</body>
</html>
`
      .replace("{userName}", userName.replace("|", " "))
      .replace("{otp}", otp);

    await emailSenderService.sendEmail(email, subject, htmlContent);
  }

  async verifyOtp(email: string, otp: string) {
    const userOTPVerification = await userOTPVerificationService.findOneByEmail(
      email
    );
    if (!userOTPVerification) {
      return {
        message:
          "Account record not found for this email. Please sign up or login",
      };
    }

    const isOtpValid = await this.authenticationService.pwdCompare(
      userOTPVerification.otp,
      otp
    );

    if (!isOtpValid)
      return { message: "Invalid code passed. check your email" };

    if (userOTPVerification.expiresAt < new Date()) {
      await UserOTPVerification.deleteMany({ email });

      return { message: "OTP expired" };
    }
    // Delete the OTP record after successful verification
    await UserOTPVerification.deleteMany({ email });

    return { success: "OTP verified successfully" };
  }
  async verifyUser(email: string, userName: string) {
    const user = await this.userService.findOneByEmailOrUserName(
      email,
      userName
    );
    if (user) {
      user.emailConfirmed = true;
      user.lastLogin = new Date();
      await user.save();
      const jwt = this.authenticationService.generateJwt(
        {
          email: user.email,
          userId: user.id,
          userName: user.userName,
          emailConfirmed: user.emailConfirmed,
          profileImg: user.profileImg,
          role: user.role,
          status: user.status,
          lastLogin: user.lastLogin ,
          expertise: user.expertise,
          yearsOfExperience: user.yearsOfExperience,
          biography: user.biography,
          educationLevel: user.educationLevel,
          fieldOfStudy: user.fieldOfStudy,
        },
        process.env.JWT_KEY!,
        false
      );
      return { user, jwt };
    } else {
      return { message: "User not found" };
    }
  }
  async RequestResetEmail(email: string) {
    const user = await userService.findOneByEmail(email);
    if (!user) return { message: "User not found" };

    const otp = userOTPVerificationService.generateOtp();
    const hashOtp = await this.authenticationService.pwdToHash(otp);
    await userOTPVerificationService.create(email, hashOtp);
    const subject = "Reset password";
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
        <div class='header'>Hello, {userName} ! &#128075</div>
        <div class='description'>You recently requested to reset your password. Please use the OTP code below to proceed:</div>
        <div class='otp-code'>{otp}</div>
        <div class='description'>This OTP is valid for 30 minutes. If you did not request this change, please ignore this email.</div>
    </div>
    <div class='footer'>
        <p>If you need assistance, contact our support team at <a href="mailto:helpdesk.elearningapp@gmail.com">helpdesk.elearningapp@gmail.com</a>.</p>
    </div>
</body>
</html>
`
      .replace("{userName}", user.userName.replace("|", " "))
      .replace("{otp}", otp);

    await emailSenderService.sendEmail(email, subject, htmlContent);

    return { success: "Email sent successfully" };
  }
  async ResetPassword(email: string, newPassword: string) {
    const result = await userService.updatePassword(email, newPassword);

    if (!result.success)
      return { success: false, message: result.message as string };

    return { success: true, message: result.message as string };
  }
  async updateUser(
    userId: mongoose.Types.ObjectId,
    updateData: updateData
  ): Promise<{ message: string; success?: boolean; jwt?: string }> {
    try {
      // const updateData: { userName: string; profileImg: string } = {
      //   userName: "",
      //   profileImg: "",
      // };

      if (updateData.userName) {
        const existingUsername = await userService.findOneByUserName(
          updateData.userName
        );
        if (existingUsername && existingUsername.id !== userId) {
          return { message: "Username is already taken", success: false };
        }
      }

      if (!updateData.profileImg) updateData.profileImg = "";
      if (!updateData.publicId) updateData.publicId = "";

      const updatedUser = await userService.updateUser(userId, updateData);

      if (!updatedUser) {
        return { message: "User not found", success: false };
      }
      const jwt = this.authenticationService.generateJwt(
        {
          email: updatedUser.email,
          userId: updatedUser.id,
          userName: updatedUser.userName,
          emailConfirmed: updatedUser.emailConfirmed,
          profileImg: updatedUser.profileImg,
          role: updatedUser.role,
          status: updatedUser.status,
          lastLogin: updatedUser.lastLogin,
          expertise: updatedUser.expertise,
          yearsOfExperience: updatedUser.yearsOfExperience,
          biography: updatedUser.biography,
          educationLevel: updatedUser.educationLevel,
          fieldOfStudy: updatedUser.fieldOfStudy,
        },
        process.env.JWT_KEY!,
        false
      );

      return { message: "User updated successfully", success: true, jwt: jwt };
    } catch (error) {
      return { message: (error as Error).message, success: false };
    }
  }
}
export const authService = new AuthService(
  userService,
  new AuthenticationService()
);

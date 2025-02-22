import User from "../models/user";
import { AuthDto } from "../routers/auth/dtos/auth.dto";

export class UserService {
  constructor() {}

  async create(createUserDto: AuthDto) {
    const user = await User.build({
      email: createUserDto.email,
      password: createUserDto.password,
      userName: createUserDto.userName,
    });

    return await user.save();
  }

  async findOneByEmailOrUserName(email: string, userName: string) {
    return await User.findOne({
      $or: [{ email: email }, { userName: userName }],
    });
  }
  async findOneByEmail(email: string) {
    return await User.findOne({ email });
  }
  async updatePassword(email: string, newPassword: string) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return { success: false, message: "User not found" };
      }

      user.password = newPassword;
      await user.save();

      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      return { success: false, message: error };
    }
  }
  async findOneByUserName(userName: string) {
    return await User.findOne({ userName });
  }
  
  async updateUser(userId: string, updateData:{userName: string; profileImg: string}) {
    return await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password'); // Exclude password from the returned data
  }
  
}

export const userService = new UserService();

import User from "../models/user";
import { AuthDto } from "../routers/auth/dtos/auth.dto";

export class UserService {
  constructor() {}

  async create(createUserDto: AuthDto) {
    const user = await User.build({
      email: createUserDto.email,
      password: createUserDto.password,
      userName: createUserDto.userName,
      role: createUserDto.role,
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
  async updatePassword(email: string, hashedPassword: string) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return { success: false, message: "User not found" };
      }

      user.password = hashedPassword;
      await user.save();

      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      return { success: false, message: error };
    }
  }
}

export const userService = new UserService();

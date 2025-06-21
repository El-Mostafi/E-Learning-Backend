import mongoose from "mongoose";
import User, { UserDocument } from "../models/user";
import { CreateUserDto, updateData } from "../routers/auth/dtos/auth.dto";
import {
  AugmentedUser,
  GetAllUsersOptions,
  UserToEdit,
} from "../routers/user/dtos/user.dtos";
import Enrollment from "../models/enrollment";
import Course from "../models/course";
import { BadRequestError, NotFoundError } from "../../common";

export class UserService {
  constructor() {}

  async create(createUserDto: CreateUserDto) {
    const user = await User.build({
      email: createUserDto.email,
      password: createUserDto.password,
      userName: createUserDto.userName,
      role: createUserDto.role,
      ...(createUserDto.role === "student" && {
        educationLevel: createUserDto.educationLevel,
        fieldOfStudy: createUserDto.fieldOfStudy,
      }),
      ...(createUserDto.role === "instructor" && {
        expertise: createUserDto.expertise,
        yearsOfExperience: createUserDto.yearsOfExperience,
        biography: createUserDto.biography,
      }),
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
  async updateUser(userId: mongoose.Types.ObjectId, updateData: updateData) {
    return await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");
  }
  async updateUserByAdmin(
    userId: mongoose.Types.ObjectId,
    updateData: updateData
  ) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }
    const updatedUser: AugmentedUser = {
      id: user.id,
      userName: user.userName,
      profileImg: user.profileImg,
      email: user.email,
      role: user.role,
      status: user.status,
      emailConfirmed: user.emailConfirmed,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
    if (user.role === "student") {
      updatedUser.coursesEnrolled = await Enrollment.countDocuments({
        participant: user._id,
      });
    }
    if (user.role === "instructor") {
      updatedUser.coursesCreated = await Course.countDocuments({
        instructor: user._id,
      });
    }
    return {
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    };
  }
  async getAllUsers(options: GetAllUsersOptions) {
    const { page, limit, role, status, search } = options;

    const query: any = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Using .lean() for performance and easy modification of objects
    const users = await User.find(query)
      .select(
        "_id userName profileImg email role status emailConfirmed createdAt lastLogin"
      )
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1, _id: -1 })
      .lean()
      .exec();

    const augmentedUsers = await Promise.all(
      users.map(async (user) => {
        const augmentedUser: AugmentedUser = {
          id: user._id.toString(),
          userName: user.userName,
          profileImg: user.profileImg,
          email: user.email,
          role: user.role,
          status: user.status,
          emailConfirmed: user.emailConfirmed,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        };
        if (user.role === "student") {
          augmentedUser.coursesEnrolled = await Enrollment.countDocuments({
            participant: user._id,
          });
        }
        if (user.role === "instructor") {
          augmentedUser.coursesCreated = await Course.countDocuments({
            instructor: user._id,
          });
        }
        return augmentedUser;
      })
    );

    const totalUsers = await User.countDocuments(query);

    return {
      users: augmentedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      totalUsers,
    };
  }

  async createUserByAdmin(data: CreateUserDto) {
    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error("Email already in use");
    }

    const user = await this.create(data);
    user.emailConfirmed = true;
    await user.save();
    return user;
  }

  /**
   * Retrieves a single user by their ID.
   */
  async getUserById(id: string): Promise<UserToEdit> {
    const user = await User.findById(id);

    if (!user) {
      throw new NotFoundError();
    }
    return {
      id: user.id,
      userName: user.userName,
      email: user.email,
      profileImg: user.profileImg,
      role: user.role,
      status: user.status,
      educationLevel: user.educationLevel || "",
      fieldOfStudy: user.fieldOfStudy || "",
      expertise: user.expertise || "",
      yearsOfExperience: user.yearsOfExperience || 0,
      biography: user.biography || "",
    };
  }

  async updateUserStatus(
    id: string,
    status: "active" | "blocked"
  ): Promise<void> {
    const user = await User.findByIdAndUpdate(id, { status }, { new: true });

    if (!user) {
      throw new NotFoundError();
    }
    return;
  }

  /**
   * Deletes a user and their associated cloud assets.
   */
  async deleteUser(id: string): Promise<void> {
    const user = await User.findById(id);

    if (!user) {
      throw new Error("User not found");
    }
    await User.findByIdAndDelete(id);
  }
  async getAdminDashboardStats() {
    const [
      totalUsers,
      totalCourses,
      activeUsers,
      studentCount,
      instructorCount,
      pendingCount,
      inactiveCount,
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ["student", "instructor"] } }),
      Course.countDocuments(),
      User.countDocuments({
        status: "active",
        role: { $in: ["student", "instructor"] },
      }),
      User.countDocuments({
        role: "student",
        status: "active",
        emailConfirmed: true,
      }),
      User.countDocuments({
        role: "instructor",
        status: "active",
        emailConfirmed: true,
      }),
      User.countDocuments({ emailConfirmed: false }),
      User.countDocuments({ status: "blocked" }),
    ]);

    const userDistribution = [
      {
        name: "Students",
        count: studentCount,
      },
      {
        name: "Instructors",
        count: instructorCount,
      },
      {
        name: "Pending",
        count: pendingCount,
      },
      {
        name: "Inactive",
        count: inactiveCount,
      },
    ];

    return {
      totalUsers,
      totalCourses,
      activeUsers,
      userDistribution,
    };
  }
}

export const userService = new UserService();

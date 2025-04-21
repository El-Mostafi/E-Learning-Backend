// services/instructor.service.ts
import { BadRequestError, NotFoundError } from "../../common";
import User,{  UserDocument } from "../models/user";

export class InstructorService {
  

  async getInstructorById(userId: string): Promise<UserDocument> {
    const instructor = await User.findOne({ _id: userId, role: "instructor" , emailConfirmed: true });
    if (!instructor) throw new NotFoundError();
    return instructor;
  }

  async getAllInstructors(): Promise<UserDocument[]> {
    return await User.find({ role: "instructor", emailConfirmed: true });
  }
}
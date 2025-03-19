// services/student.service.ts
import {  NotFoundError } from "../../common";
import User , { UserDocument } from "../models/user";;

export class StudentService {


  async getStudentById(userId: string): Promise<UserDocument> {
    const student = await User.findOne({ _id: userId, role: "student" });
    if (!student) throw new NotFoundError();
    return student;
  }

  async getAllStudents(): Promise<UserDocument[]> {
    return await User.find({ role: "student" });
  }
}
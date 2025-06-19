import { UserDocument, UserRole } from "../../../models/user";

export interface GetAllUsersOptions {
  page: number;
  limit: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface AugmentedUser {
  id: string;
  userName: string;
  email: string;
  profileImg: string;
  role: UserRole;
  status: "active" | "blocked";
  emailConfirmed: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  coursesEnrolled?: number;  
  coursesCreated?: number;  
}

export interface UserToEdit{
  id: string;
  userName: string;
  email: string;
  profileImg: string;
  role: UserRole;
  status: "active" | "blocked";
  // Student fields
  educationLevel: string;
  fieldOfStudy: string;
  // Instructor fields
  expertise: string;
  yearsOfExperience: number;
  biography: string;
}


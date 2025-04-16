import { UserRole } from "../../../models/user";
export interface AuthDto {
    email :string,
    password: string,
    userName:string,
    RememberMe:boolean,
    AboutMe?: string
}
export interface CreateUserDto extends AuthDto {
    role: UserRole;
    educationLevel?: string;
    fieldOfStudy?: string;
    expertise?: string;
    yearsOfExperience?: number;
    biography?: string;
  }
export interface updateData{
    userName?: string;
    profileImg?: string;
    publicId?:string;
    educationLevel?: string;
    fieldOfStudy?: string;
    expertise?: string;
    yearsOfExperience?: string;
    biography?: string;
}
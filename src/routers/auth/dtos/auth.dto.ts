export interface AuthDto {
    email :string,
    password: string,
    userName:string,
    RememberMe:boolean,
    AboutMe?: string
}
export interface CreateUserDto extends AuthDto {
    role: "student" | "instructor";
    // Student-specific fields
    educationLevel?: string;
    fieldOfStudy?: string;
    // Instructor-specific fields
    expertise?: string;
    yearsOfExperience?: number;
    biography?: string;
  }
export interface updateData{
    userName?: string;
    profileImg?: string;
    educationLevel?: string;
    fieldOfStudy?: string;
    expertise?: string;
    yearsOfExperience?: string;
    biography?: string;
}
export interface AuthDto {
    email :string,
    password: string,
    userName:string,
    role: "instructor" | "student" | "admin",
    AboutMe?: string
}

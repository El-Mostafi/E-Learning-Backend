import User  from '../models/user'
import { AuthDto } from '../routers/auth/dtos/auth.dto'

export class UserService {
    constructor(
    ) {}

    async create(createUserDto: AuthDto) {
        const user = await User.build({
            email: createUserDto.email,
            password: createUserDto.password,
            userName: createUserDto.userName
        });

        return await user.save()
    }

    async findOneByEmailOrUserName(email: string, userName: string) {
        return await User.findOne({
            $or: [
                { email: email },
                { userName: userName }
            ]
        });
    }
    

}

export const userService = new UserService()
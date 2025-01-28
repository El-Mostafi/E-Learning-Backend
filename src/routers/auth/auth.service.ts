import { UserService,userService } from '../../service/user.service'
import { AuthDto } from './dtos/auth.dto'
import {  AuthenticationService } from "../../../common"

export class AuthService {
    constructor(
        public userService: UserService,
        public authenticationService: AuthenticationService
    ) {}

    async signup(createUserDto: AuthDto ) {
        const existingUser = await this.userService.findOneByEmailOrUserName(createUserDto.email , createUserDto.userName)
        if(existingUser) return { message: "email or user name is taken"  }

        
        const newUser = await this.userService.create(createUserDto);
        
        const jwt = this.authenticationService.generateJwt({ email: createUserDto.email, userId: newUser.id , userName: createUserDto.userName}, process.env.JWT_KEY!);
        
        return {jwt,newUser};
    }

    async signin(signinDto: AuthDto) {
        const user = await this.userService.findOneByEmailOrUserName(signinDto.email,signinDto.userName);
        if(!user) return { message: "wrong credentials" }

        const samePwd = this.authenticationService.pwdCompare(user.password, signinDto.password);

        if(!samePwd) return { message: "wrong credentials" }

        const jwt = this.authenticationService.generateJwt({ email: user.email, userId: user.id, userName: user.userName }, process.env.JWT_KEY!);        
        
        return {jwt,user};
    }
}

export const authService = new AuthService(userService, new AuthenticationService())

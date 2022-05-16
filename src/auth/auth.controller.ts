import {
  ClassSerializerInterceptor,
  Controller,
  Get, Logger,
  Post, Req,
  Request, Res,
  SerializeOptions,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { Response } from "express";

@Controller('auth')
@SerializeOptions({strategy: "excludeAll"})
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
  ) { }
  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(@Req() request, @Res() response: Response) {
    const token = this.authService.getTokenForUser(request.user);
    this.logger.log(token);
    const {username, id, avatar} = request.user;
    const a = avatar ? avatar.url : '';
    const cookie = this.authService.getCookieFromToken(token);
    response.setHeader('Set-Cookie', cookie);
     response.send({
       ...request.user,
       token: token
     });
  }

  @Get('/logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() request: Express.Request, @Res() response: Response) {
    response.clearCookie('Authentication').send(response);
  }

  @Get('authn')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(ClassSerializerInterceptor)
  async authenticate(@Req() request) {
    return request.user;
  }
  @Get('account')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(ClassSerializerInterceptor)
  async getUser(@Request() request) {
    return request.user;
  }
}

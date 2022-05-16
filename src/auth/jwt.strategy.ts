import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { User } from "../user/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { request, Request } from "express";
import { HttpException, HttpStatus, Injectable, Logger, Req, UnauthorizedException } from "@nestjs/common";
import { TokenPayload } from "./auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.Authentication;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken()
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.AUTH_SECRET,
    });
  }
  private static extractJwtFromCookies(req: Request) {
    return req?.cookies?.Authentication;
  }

  async validate(payload: TokenPayload, @Req() request: Request) {
    const {
      username,
      sub
    } = payload;

    this.logger.log(request.user);
    try {
      const user = await this.userRepository.findOne({id: sub, username: username});
      if(user) {
        return user;
      }

      return {
        id: sub,
        username: username
      };
    } catch (e) {
      console.log('error ', e);
      throw new Error(e);
    }

  }
}


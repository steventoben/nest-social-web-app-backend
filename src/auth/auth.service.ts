import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "../user/user.entity";
import { hash } from "bcrypt";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
export interface TokenPayload {
  username: string;
  sub: number;
}
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) { }
  public getTokenForUser(user: User): string {
    const payload: TokenPayload = {
      username: user.username,
      sub: user.id
    };
    return this.jwtService.sign(payload);
  }
  public getCookieFromToken(token: string, expiration?: string) {
    const expires = new Date(Date.now() + 1000 * 60 * 60);
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${expires}; Secure; SameSite=None`;
  }
  public attachCookie(response: Response,
                   token: string,
                   expiration: Date = new Date(Date.now() + 1000 * 60 * 60)): Response {
    return response.cookie('token', token, {
      httpOnly: true,
      expires: expiration,
      secure: true,
      sameSite: 'none'
    });
  }

  public async hashPassword(password: string): Promise<string> {
    return await hash(password, 10);
  }
}

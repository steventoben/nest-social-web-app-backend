import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { Repository } from "typeorm";
import { User } from "../user/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { compare } from "bcrypt";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }
  public async validate(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { username },
    });
    if (!user) {
      this.logger.debug(`User with username: ${username} does not exist.`);
      throw new UnauthorizedException('u.User with that name does not exist.');
    }
    if(!await compare(password, user.password)) {
      this.logger.debug(`User: ${username} has password: ${user.password}, not: ${password}`);
      throw new UnauthorizedException('p.Username and password do not match.');
    }
    return user;
  }
}

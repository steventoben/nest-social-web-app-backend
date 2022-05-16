import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/user.entity";
import { AuthController } from "./auth.controller";
import { LocalStrategy } from "./local.strategy";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { UsersController } from "../user/users.controller";
import { UserService } from "../user/user.service";
import { Follow } from "../user/follow.entity";
import { Favorite } from "../user/favorite.entity";
import { Community } from "../user/community.entity";
import { CommunityController } from "../user/community.controller";
import { CommunityService } from "../user/community.service";
import { FileEntity } from "../files/file.entity";
import { FilesService } from "../files/files.service";
import { AppModule } from "../app.module";
import { ConfigModule } from "@nestjs/config";
import { PostEntity } from "../posts/post.entity";
import { MulterModule } from "@nestjs/platform-express";

@Module({
  imports: [
    TypeOrmModule.forFeature([PostEntity, User, Follow, Favorite, Community, FileEntity]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.AUTH_SECRET,
        signOptions: {
          expiresIn: '60m',
        },
      }),
    }),
    ConfigModule,
  ],
  controllers: [AuthController, UsersController, CommunityController],
  providers: [LocalStrategy, JwtStrategy, AuthService, UserService, CommunityService, FilesService],
  exports: [UserService, CommunityService]
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostEntity } from "./post.entity";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { Comment } from "./comment.entity";
//import { Favorite } from "../user/favorite.entity";
import { AuthModule } from "../auth/auth.module";
import { User } from "../user/user.entity";
import { Favorite } from "../user/favorite.entity";
import { Category } from "./category.entity";
import { Community } from "../user/community.entity";
import { FileEntity } from "../files/file.entity";
import { FilesService } from "../files/files.service";
import { ConfigService } from "@nestjs/config";
import { CommentController } from "./comment.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([PostEntity, Comment, User, Favorite, Category, Community, FileEntity]),
    AuthModule
  ],
  controllers: [PostsController, CommentController],
  providers: [PostsService, FilesService, ConfigService],
  exports: [PostsService]
})
export class PostsModule {}

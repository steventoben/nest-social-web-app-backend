import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { PostsModule } from "../posts/posts.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    PostsModule,
    AuthModule
  ],
  controllers: [SearchController],
  providers: []
})
export class SearchModule {}

import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostsModule } from "./posts/posts.module";
import { PostEntity } from "./posts/post.entity";
import { AuthModule } from "./auth/auth.module";
import { User } from "./user/user.entity";
import { Comment } from "./posts/comment.entity";
import { Follow } from "./user/follow.entity";
import { Favorite } from "./user/favorite.entity";
import { Category } from "./posts/category.entity";
import { Community } from "./user/community.entity";
import { ConfigModule } from "@nestjs/config";
import { FileEntity } from "./files/file.entity";
import { MulterModule } from "@nestjs/platform-express";
import { SearchModule } from "./search/search.module";
//import { Neo4jModule } from "nest-neo4j/dist";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { Connection, ConnectionOptions, getConnectionOptions } from "typeorm";
import { BaseConnectionOptions } from "typeorm/connection/BaseConnectionOptions";
import { TYPEORM_MODULE_OPTIONS } from "@nestjs/typeorm/dist/typeorm.constants";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { config } from "dotenv";

//import { Favorite } from "./user/favorite.entity";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      entities: [PostEntity, User, Comment, Follow, Favorite, Category, Community, FileEntity],
      synchronize: true,
    }),
    /*Neo4jModule.forRoot({
      scheme: 'bolt',
      host: 'localhost',
      port: 7687,
      username: 'neo4j',
      password: 'rootUSER12!@'
    }),*/
    MulterModule.register({dest: './uploaded-files'}),
    ConfigModule,
    PostsModule,
    AuthModule,
    SearchModule,
    //UtilitiesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

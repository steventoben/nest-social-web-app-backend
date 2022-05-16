import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode, Logger,
  Param,
  Patch,
  Post, Query,
  Request, UploadedFiles,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import {PartialType} from "@nestjs/mapped-types";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { PostEntity } from "src/posts/post.entity";
import { UpdatePostDTO } from "./dto/update-post.dto";
import { CreatePostDTO } from "./dto/create-post.dto";
import { CurrentUser } from "../auth/current-user.decorator";
import { User } from "../user/user.entity";
import { AuthGuard } from "@nestjs/passport";
import { PostsService } from "./posts.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { FilesInterceptor } from "@nestjs/platform-express";

@Controller('/posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name);
  constructor(
    private readonly postsService: PostsService,
  ) {}

  @Get()
  async findPostsWithTopics(
    @Query('topic') topic: string,
    @Query('page') page: number,
    @Query('perPage') perPage: number,
    //Query('sort') sort: string
  ) {
    const topics = topic.trim().split(/,/g);
    return await this.postsService.getPostsWithSomeCategories(topics, {page: page, perPage: perPage});
  }

  @Get('/all')
  async findAll(@Query('limit') limit: number = 10,
                @Query('page') page: number = 0) {
    return await this.postsService.getPostsPaginated(limit, page);
  }
  @Get('/tags')
  async getAllTags() {
    return await this.postsService.getAllCategories();
  }

  @Get(':id')
  async findOne(@Param('id') id) {
    return await this.postsService.getPost(id);
  }

  @Get('/post/:slug')
  async getOne(@Param('slug') slug) {
    return await this.postsService.getBySlug(slug);
  }
  @Get('/tag/:tag')
  async getByTag(@Param('tag') tag) {
    return await this.postsService.getByCategory(tag);
  }


  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FilesInterceptor('files'))
  async create(@Body() input: CreatePostDTO, @CurrentUser() user: User, @UploadedFiles() files: Array<Express.Multer.File>) {
    this.logger.log(input.categories.toString());
    this.logger.log(JSON.parse(input.categories));
    this.logger.log(input.categories?.length);
    const body: CreatePostDTO = {
      ...input,
      categories: JSON.parse(input.categories)
    };
    return await this.postsService.createPost(body, user, files);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id, @Body() input: UpdatePostDTO, @CurrentUser() user: User) {
    const post = await this.postsService
      .getPostQueryBuilder('post')
      .where('id = :id', {id})
      .getOne();
    return await this.postsService.updatePost(id, input, user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(204)
  async remove(@Param('id') id) {
    return await this.postsService.removePost(id);
  }

  @Post(':id/comments')
  @UseGuards(AuthGuard('jwt'))
  async createComment(@Param('id') id, @Body() input: CreateCommentDto, @CurrentUser() user: User) {
    return await this.postsService.addComment(id, input, user);
  }

  @Delete(':id/comments')
  @UseGuards(AuthGuard('jwt'))
  async removeComment(@Param('id') id, @CurrentUser() user: User) {
    return await this.postsService.removeComment(id, user);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id) {
    return await this.postsService.getComments(id);
  }
  @Post(':id/favorite')
  @UseGuards(AuthGuard('jwt'))
  async favorite(@Param('id') id, @CurrentUser() user: User) {
    return await this.postsService.addFavorite(id, user);
  }
  @Delete(':id/favorite')
  @UseGuards(AuthGuard('jwt'))
  async unFavorite(@Param('id') id, @CurrentUser() user: User) {
    return await this.postsService.removeFavorite(id, user);
  }
}

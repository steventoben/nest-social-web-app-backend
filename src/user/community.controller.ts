import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post, Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { CreateCommunityDto } from "./dto/create-community.dto";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser } from "../auth/current-user.decorator";
import { CommunityService } from "./community.service";
import { User } from "./user.entity";
import { CreatePostDTO } from "../posts/dto/create-post.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { Multer } from "multer";
import { UpdateCommunityDto } from "./dto/update-community.dto";

@Controller('/community')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService
  ) {
  }
  @Get('/all')
  public async getCommunities() {
    return await this.communityService.getAllCommunities();
  }
  @Get('top')
  public async getTopCommunities() {
    return await this.communityService.getTopCommunities(5);
  }
  @Get('trending')
  public async getTopPostsFromTopCommunities() {
    return await this.communityService.getTopPostsFromAll();
  }
  @Get(':name')
  @UseGuards(AuthGuard('jwt'))
  public async getCommunity(@Param('name') name, @CurrentUser() user: User) {
    return await this.communityService.getCommunity(name, user);
  }
  @Post('/create')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  public async createCommunity(@Body() input: CreateCommunityDto, @CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    return await this.communityService.createCommunity(input, user, file);
  }
  @Patch(':name')
  @UseGuards(AuthGuard('jwt'))
  public async updateCommunity(@Param('name') name, @Body() input: UpdateCommunityDto, @CurrentUser() user: User) {
    return await this.communityService.updateCommunity(name, input, user);
  }
  @Post(':name')
  @UseGuards(AuthGuard('jwt'))
  public async joinCommunity(@Param('name') name, @CurrentUser() user: User) {
    return await this.communityService.joinCommunity(name, user);
  }
  @Delete(':name')
  @UseGuards(AuthGuard('jwt'))
  public async leaveCommunity(@Param('name') name, @CurrentUser() user: User) {
    return await this.communityService.leaveCommunity(name, user);
  }

  @Post(':name/photo')
  @UseInterceptors(FileInterceptor('file'))
  public async addPhoto(@Param('name') name: string, @UploadedFile() file: Express.Multer.File) {
    return await this.communityService.addPhoto(name, file.buffer, file.originalname);
  }
  @Delete(':name/photo')
  @UseGuards(AuthGuard('jwt'))
  public async removePhoto(@Param('name') name: string) {
    return await this.communityService.removePhoto(name);
  }

  @Get(':name/members')
  public async getMembers(@Param('name') name) {
    return await this.communityService.getMembers(name);
  }
  @Get(':name/posts')
  public async getPosts(@Param('name') name, @Query('sort') sortBy: string) {
    return await this.communityService._getPosts(name, sortBy);
  }
  @Get(':name/posts/trending')
  public async getTrendingPosts(@Param('name') name) {
    return await this.communityService.getTrendingPosts(name);
  }

}

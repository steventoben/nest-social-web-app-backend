import {
  BadRequestException,
  Body, ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post, Query, SerializeOptions, UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { AuthService } from "../auth/auth.service";
import { UserService } from "./user.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { Express } from 'express';
import { BatchCreateUsers } from "./interface/user.interface";


@Controller('users')
@SerializeOptions({strategy: 'excludeAll'})
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  @Get()
  async getUsers() {
    return await this.userService.getUsers();
  }
  @Get('all')
  async getUsersPaginated(@Query('limit') limit: number = 5,
                          @Query('page') page: number = 0) {
    return await this.userService.getUsersPaginated(limit, page);
  }
  @Get('me/following')
  @UseGuards(AuthGuard('jwt'))
  async getMyFollows(@CurrentUser() user: User) {
    return this.userService.getFollowing(100, 0, user.id);
  }
  @Get('me/followers')
  @UseGuards(AuthGuard('jwt'))
  async getMyFollowers(@CurrentUser() user: User) {
    return this.userService.getFollowers(user.id, 0, 100);
  }
  @Post()
  async create(@Body() input: CreateUserDto) {
    const user = new User();
    this.logger.debug(`${input.username} , ${input.password}`);
    const existingUser = await this.userRepository.findOne({
      where: [{ username: input.username }],
    });
    if (existingUser) {
      this.logger.debug(`${existingUser.username} , ${existingUser.password} , ${existingUser.id}`);
      throw new BadRequestException(['User with that username already exists']);
    }
    user.username = input.username;
    user.password = await this.authService.hashPassword(input.password);
    return {
      ...(await this.userRepository.save(user)),
      token: this.authService.getTokenForUser(user),
    };
  }
  @Delete()
  @UseGuards(AuthGuard('jwt'))
  async removeUser(@CurrentUser() user: User) {
    return await this.userService.removeUser(user.id);
  }
  //Admin privileges
  /*@Delete(':id')
  async _removeUser(@Param('id') id) {
    return await this.userService.removeUser(id);
  }*/
  @Post('avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async addAvatar(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    return this.userService.addAvatar(user.id, file.buffer, file.originalname);
  }
  @Post('/_create')
  async batchCreate(@Body() input: BatchCreateUsers) {
    return this.userService._batchCreateUsers(input.names);
  }
  @Get('/my-data')
  @UseGuards(AuthGuard('jwt'))
  async getUser(@CurrentUser() user: User) {
    return this.userService.getUser(user.id);
  }
  @Get('/my-stats')
  @UseGuards(AuthGuard('jwt'))
  async getUserStats(@CurrentUser() user: User) {
    return this.userService.getUserStats(user.username);
  }
  @Get('/my-feed')
  @UseGuards(AuthGuard('jwt'))
  async getFeed(@CurrentUser() user: User) {
    return this.userService.getFeed(user.id);
  }
  @Post('/fake-requests')
  @UseGuards(AuthGuard('jwt'))
  async fun(@Body() body) {
    return body;
  }
  @Get('/me/communities')
  @UseGuards(AuthGuard('jwt'))
  async getMyCommunities(@CurrentUser() user: User) {
    return this.userService.getCommunities(user.id);
  }
  @Get(':username')
  @UseGuards(AuthGuard('jwt'))
  async getUserByUsername(@Param('username') username, @CurrentUser() user: User) {
    return this.userService.findUserByUsername(username, user);
  }

  @Get(':username/posts')
  async getPostsByUsername(@Param('username') username, @Query('sort') sort: string) {
    return this.userService.findPostsByUsername(username, sort);
  }
  @Get(':username/comments')
  async getCommentsByUsername(@Param('username') username) {
    return this.userService.findCommentsByUsername(username);
  }
  @Get(':username/favorites')
  async getFavoritesByUsername(@Param('username') username) {
    return this.userService.findFavoritesByUsername(username);
  }
  @Get(':id/f')
  async getF(@Param('id') id,
             @Query('limit') limit: number = 10,
             @Query('page') page: number = 0) {
    return this.userService.getFollowing(limit, page, id);
  }
  @Get(':id/fg')
  async getFing(@Param('id') id,
             @Query('limit') limit: number = 10,
             @Query('page') page: number = 0) {
    return this.userService.getFollowers(id, page, limit);
  }
  @Get(':id/followers')
  async getFollowersPaginated(@Param('id') id,
                              @Query('limit') limit: number = 5,
                              @Query('page') page: number = 0) {
    return this.userService.getFollowersPaginated(id, limit, page);
  }
  @Get(':id/following')
  async getFollowingPaginated(@Param('id') id,
                              @Query('limit') limit: number = 5,
                              @Query('page') page: number = 0) {
    return this.userService.getFollowingPaginated(id, limit, page);
  }
  @Post(':username/follow')
  @UseGuards(AuthGuard('jwt'))
  async follow(@Param('username') username: string, @CurrentUser() user: User) {
    return await this.userService.createFollow(user.username, username);
  }
  @Delete(':username/follow')
  @UseGuards(AuthGuard('jwt'))
  async unFollow(@Param('username') username, @CurrentUser() user: User) {
    return await this.userService.removeFollow(user.username, username);
  }
  @Get(':id/communities')
  async getCommunities(@Param('id') id) {
    return this.userService.getCommunities(id);
  }
}

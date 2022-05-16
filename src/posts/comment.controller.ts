import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { AuthGuard } from "@nestjs/passport";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { CurrentUser } from "../auth/current-user.decorator";
import { User } from "../user/user.entity";

@Controller('comments')
export class CommentController {
  constructor(
    private readonly postsService: PostsService
  ) { }
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async editComment(@Param('id') id, @Body() input: UpdateCommentDto, @CurrentUser() user: User) {
    return await this.postsService.updateComment(id, input, user);
  }
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async removeComment(@Param('id') id, @CurrentUser() user: User) {
    return await this.postsService.removeComment(id, user);
  }
}

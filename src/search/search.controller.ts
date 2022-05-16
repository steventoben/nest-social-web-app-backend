import { Controller, Get, Logger, Query } from "@nestjs/common";
import { PostsService } from "../posts/posts.service";
import { UserService } from "../user/user.service";
import { CommunityService } from "../user/community.service";

@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);
  constructor(
    private readonly postsService: PostsService,
    private readonly userService: UserService,
    private readonly communityService: CommunityService
  ) { }
  @Get()
  async globalSearch(
    @Query('q') query: string
  ) {
    this.logger.debug(query);
    let sortBy = '';
    const postResults = await this.postsService.searchTitles(query) || [];
    const userResults = await this.userService.searchUsers(query) || [];
    const communityResults = await this.communityService.searchCommunities(query) || [];
    const searchResults = {
      posts: postResults,
      users: userResults,
      communities: communityResults
    };
    return searchResults;
  }
  @Get()
  async searchTags(@Query('tag') query: string) {
    this.logger.debug(query);
    return await this.postsService.searchCategories(query);
  }

}

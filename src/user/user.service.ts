import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Injectable,
  Logger,
  UseInterceptors
} from "@nestjs/common";
import { Repository, SelectQueryBuilder } from "typeorm";
import { User } from "./user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Follow } from "./follow.entity";
import { Favorite } from "./favorite.entity";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Community } from "./community.entity";
import { FileEntity } from "../files/file.entity";
import { FilesService } from "../files/files.service";
import { PostEntity } from "../posts/post.entity";
import { CommentRo } from "../posts/interface/comment.interface";
import { AvatarRo } from "./interface/user.interface";
//import { Neo4jService } from "nest-neo4j/dist";
import { CreateUserDto } from "./dto/create-user.dto";
import { AuthService } from "../auth/auth.service";
import { PaginatedPostsRo } from "../posts/interface/post.interface";
import { PaginatedRo } from "../paginate/interface/paginated.interface";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followerRepository: Repository<Follow>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    private readonly fileService: FilesService,
    //private readonly neo4jService: Neo4jService,
    private readonly authService: AuthService
  ) { }

  public getUserBaseQuery() {
    return this.userRepository.createQueryBuilder('user');
  }

  public async createUser(input: CreateUserDto) {
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
  public async _batchCreateUsers(names: string[]) {
    for(const name of names) {
      const input: CreateUserDto = {
        username: name,
        password: 'password'
      }
      await this._createUser(input);
    }
  }
  public async _createUser(input: CreateUserDto) {
    const user = new User();
    this.logger.debug(`${input.username} , ${input.password}`);
    const existingUser = await this.userRepository.findOne({
      where: [{ username: input.username }],
    });
    if (existingUser) {
      this.logger.debug(`${existingUser.username} , ${existingUser.password} , ${existingUser.id}`);
      return;
    }
    user.username = input.username;
    user.password = await this.authService.hashPassword(input.password);
    await this.userRepository.save(user);
  }
  public userQbPostsOfUser(qb: SelectQueryBuilder<User>) {
    return qb
      .leftJoin('posts.author', 'author')
      .addSelect(['author.username', 'author.createdAt'])
      .leftJoinAndSelect('author.avatar', 'avatar')
      .leftJoinAndSelect('posts.attachments', 'attachments')
      .leftJoin('posts.community', 'community')
      .addSelect('community.name')
      .leftJoinAndSelect('posts.categories', 'categories')
      .leftJoinAndSelect('posts.comments', 'post-comments')
      .leftJoin('post-comments.commenter', 'pc-commenter')
      .addSelect('pc-commenter.username')
      .leftJoinAndSelect('pc-commenter.avatar', 'pc-commenter-avatar');
  }
  public getUserNameWithAvatarQuery() {
    return this.getUserBaseQuery()
      .leftJoinAndSelect('user.username', 'username')
      .leftJoinAndSelect('user.avatar', 'avatar');
  }

  public async getUsers() {
    return await this.userRepository.find();
  }
  //@UseInterceptors(ClassSerializerInterceptor)
  public async getUsersPaginated(limit: number = 5, page: number = 0) {
    const usersWithCount = await this.userRepository.findAndCount(
      {
        take: limit,
        skip: page * limit
      }
    );
    const count = usersWithCount[1];
    const users = usersWithCount[0];
    const ro: PaginatedRo<User> = {
      totalResults: count,
      limit: limit,
      page: page,
      pageCount: Math.ceil(count / limit),
      pageResultsCount: users.length,
      pageResults: users
    };
    return ro;
  }
  public async getUser(id: number) {
    const user = await this.userRepository.findOne(id);
    return await this.userRepository
      .createQueryBuilder('u')
      .where('u.id = :id', {id})
      .leftJoinAndSelect('u.posts', 'posts')
      .leftJoinAndSelect('posts.attachments', 'attachments')
      .leftJoinAndSelect('posts.community', 'community')
      .leftJoinAndSelect('posts.categories', 'categories')
      .leftJoinAndSelect('posts.comments', 'post-comments')
      .leftJoinAndSelect('post-comments.commenter', 'pc-commenter')
      .leftJoinAndSelect('pc-commenter.avatar', 'pc-avatar')
      .leftJoinAndSelect('u.followers', 'follower')
      .leftJoinAndSelect('follower.following', 'following')
      .leftJoinAndSelect('following.avatar', 'avatar')
      .leftJoinAndSelect('u.following', 'followings')
      .leftJoinAndSelect('u.favorites', 'favorites')
      .leftJoinAndSelect('favorites.post', 'post')
      .leftJoinAndSelect('u.communities', 'communities')
      .leftJoinAndSelect('communities.photo', 'photo')
      .leftJoinAndSelect('u.avatar', 'user-avatar')
      .getMany();
  }

  /*public async getUserStatsGdb(username: string) {

    let ro = {};
    try {
      this.logger.log('transaction begin');
      let result = await this.neo4jService.write(`
        MATCH (user:User {username: $user})
        CALL {
        WITH user
        MATCH (user)-[:FOLLOWS]->(fg:User)
        RETURN count(fg) as followingCount
        }
        CALL {
        WITH user
        MATCH (user)<-[:FOLLOWS]-(fr:User)
        RETURN count(fr) as followerCount
        }
        CALL {
        WITH user
        MATCH (user)-[:FAVORITES]->(favorite:Post)
        RETURN count(favorite) as favoriteCount
        }
        CALL {
        WITH user
        MATCH (user)-[:POSTED]->(post:Post)
        RETURN count(post) as postCount
        }
        RETURN followingCount, followerCount, favoriteCount, postCount
      `,
        { user: username }
      );
      result.records.forEach((record) => {
        for (const key of record.keys) {
          this.logger.log(<string>key + ' = ' + record.get(key));
          ro[key] = record.get(key).low;
        }
        this.logger.log(record.keys.map(v => v));
        //record.map((field) => followers.push(field))
        this.logger.log(record.entries());
        //this.logger.log(followers);
        //followers.push(record);
      });
    } catch (err) {
      this.logger.log(err);
    } finally {
      //this.neo4jService.
      this.logger.log('transaction finally');
    }
    return ro;
  }*/
  public async getUserStats(username: string) {

    const user = await this.userRepository.findOne({where: [{username: username}], relations: ['posts', 'followers', 'following', 'favorites']});
    this.logger.log(user.posts.length);
    this.logger.log(user.followers.length);
    this.logger.log(user.following.length);
    this.logger.log(user.favorites.length);
    return {
      following: user.following.length,
      followers: user.followers.length,
      posts: user.posts.length,
      favorites: user.favorites.length
    };
  }

  public async searchUsers(search: string) {
    this.logger.debug(search);
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select('user.username')
      .where(`to_tsvector('simple', user.username) @@ to_tsquery('simple', :search)`,
        {search: `${search}:*`})
      .leftJoinAndSelect('user.avatar', 'avatar')
      .getMany();
    return users;
  }
  public async findUserByUsername(username: string, user: User) {
    const foundUser = await this.userRepository.findOne({where: [{username: username}]});
    const posts = await this.findPostsByUsername(username);
    const comments = await this.findCommentsByUsername(username);
    const favorites = await this.findFavoritesByUsername(username);
    const userAvatar = foundUser.avatar;
    const avatar: AvatarRo = {
      id: userAvatar ? userAvatar.id : 0,
      url: userAvatar ? userAvatar.url : ''
    }
    const follow = await this.followerRepository.findOne(
      {where: [{
        following: foundUser, follower: user }],
        relations: ['follower', 'following']
      });
    const isFollowing = follow !== undefined;
    return [{posts, comments, favorites, avatar}, isFollowing];
  }
  public async updateUser(@Body() input: UpdateUserDto, user: User) {
    const updatedUser = {
      ...user,
      input
    };
    return await this.userRepository.save(updatedUser);
  }

  public async removeUser(id: number) {
    const user = await this.userRepository.findOne(id);
    return await this.userRepository.remove(user);
  }
  public async addAvatar(id: number, fileBuffer: Buffer, fileName: string) {
    const user = await this.userRepository.findOne(id);
    if(user.avatar) {
      await this.userRepository.update(id, {
        ...user,
        avatar: null
      });
      await this.fileService.removeFile(user.avatar.id);
    }
    const avatar = await this.fileService.uploadFile(fileBuffer, fileName);
    await this.userRepository.update(id, {
      ...user,
      avatar
    });
    return avatar;
  }
  public async removeAvatar(id: number) {
    const user = await this.userRepository.findOne(id);
    const fileId = user.avatar?.id;
    if(fileId) {
      await this.userRepository.update(id, {
        ...user,
        avatar: null
      });
      await this.fileService.removeFile(fileId);
    }
  }
  public async getPosts(id: number) {
    const user = await this.userRepository.findOne(id, {relations: ['posts']});
    return await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.posts', 'posts')
      .where('user.id = :id', {id})
      .addSelect('posts')
      .leftJoin('posts.author', 'author')
      .addSelect('author.username')
      .leftJoinAndSelect('posts.comments', 'comments')
      .leftJoin('comments.commenter', 'commenter')
      .addSelect('commenter.username')
      .leftJoin('posts.community', 'community')
      .addSelect('community.name')
      .getMany();
  }

  public async getFeed(id: number) {
    const user = await this.userRepository.findOne(id, {relations: ['following', 'followers', 'communities']});
    const followingIds = user.followers.map(follow => follow.followingId);
    this.logger.log(followingIds.toString());
    const followPosts = await this.postRepository.findByIds(followingIds);
    const communityIds = user.communities.map(c => c.id);
    const communityPosts = await this.postRepository.findByIds(communityIds);
    const qb = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', {id})
      .leftJoinAndSelect('user.followers', 'followers')
      .leftJoinAndSelect('followers.following', 'following')
      .leftJoinAndSelect('following.posts', 'posts');
    const cqb = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', {id})
      .leftJoinAndSelect('user.communities', 'communities')
      .leftJoinAndSelect('communities.posts', 'posts');
    const followingPosts = await this.userQbPostsOfUser(qb).getMany();
    const cPosts = await this.userQbPostsOfUser(cqb).getMany();
    const posts = [].concat(...followingPosts[0].followers.map(follow => follow.following.posts));
      return posts;
  }

  public async findPostsByUsername(username: string, sort?: string) {
    const qb = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.posts', 'posts')
      .where('user.username = :username', {username});
    if(sort && sort.toLowerCase() === 'recent') {
      const userWithPosts = await this.userQbPostsOfUser(qb).addOrderBy('posts.createdAt', 'DESC').getMany();
      return userWithPosts[0].posts;
    }
    if(sort && sort.toLowerCase() === 'top') {
      const userWithPosts = await this.userQbPostsOfUser(qb).addOrderBy('posts.favoriteCount', 'DESC').getMany();
      return userWithPosts[0].posts;
    }
    const userWithPosts = await this.userQbPostsOfUser(qb).addOrderBy('posts.favoriteCount', 'DESC').getMany();
    return userWithPosts[0].posts;
  }
  public async findCommentsByUsername(username: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.comments', 'comments')
      .where('user.username = :username', {username})
      .leftJoinAndSelect('comments.commenter', 'commenter')
      .leftJoinAndSelect('commenter.avatar', 'avatar')
      .getOne();
      this.logger.log(user.comments.length);
      this.logger.log(user.comments.map(c => c.id));
      const comments: CommentRo[] = user.comments.map((comment) => {
        this.logger.log(comment.id);
        const commenter = comment.commenter;
        return {
          id: comment.id,
          content: comment.content,
          commenter: {
            id: comment.commenterId,
            username: commenter.username,
            avatar: {
              id: comment.commenter.avatar.id,
              url: comment.commenter.avatar.url
            }
          },
          createdAt: comment.createdAt
        };
      });
      return comments;
  }
  public async findFavoritesByUsername(username: string) {
    const favs = await this.favoriteRepository
      .createQueryBuilder('fav')
      .leftJoin('fav.user', 'user')
      .where('user.username = :username', {username})
      .getMany();
    const ret = [];
    for(const fav of favs) {
      ret.push(await this.postRepository.findOne(fav.postId, {relations: ['author', 'comments', 'community', 'categories']}));
    }
    return ret;
  }
  public async getFavorites(id: number) {
    const user = await this.userRepository.findOne(id);
    return await this.favoriteRepository
      .createQueryBuilder('fav')
      .leftJoin('fav.user', 'user')
      .where('user.id = :id', {id})
      .leftJoinAndSelect('fav.post', 'post')
      .getMany();
  }
  public async getFollowers(id: number, page: number, limit: number) {
    const f: User = await this.userRepository.findOne(id,
      {
        relations: ['followers', 'following']
      });
    this.logger.log(id);
    this.logger.log(f.username);
    this.logger.log(f.following);
    this.logger.log(f.followers);
    this.logger.log(f.id);
    const ids = f.followers.map(follower => follower.followingId)
      .filter((value) => {
        return typeof value === 'number';
      });
    this.logger.log(ids);
    const follows = await this.userRepository.findByIds(ids, {
      take: limit,
      skip: (page * limit)
    });
    return follows;
  }
  public async getFollowing(limit: number, page: number, id: number) {
    const f = await this.userRepository.findOne(id,
      {
        relations: ['followers', 'following']
      });
    const ids = f.following.map(following => following.followerId)
      .filter((value) => {
        return typeof value === 'number';
      });
    this.logger.log(ids);
    const following = await this.userRepository.findByIds(ids, {
      take: limit,
      skip: (page * limit)
    });
    return following;
  }
  public async getFollowersPaginated(id: number, limit: number, page: number) {
    const qb = this.followerRepository
      .createQueryBuilder('follow')
      .leftJoin('follow.following', 'following')
      .where('following.id = :id', {id})
      .leftJoin('follow.follower', 'user')
      .addSelect('user.username')
      .leftJoinAndSelect('user.avatar', 'avatar');
    const count = await qb.getCount();
    const followers = await qb
      .take(limit)
      .skip(page * limit)
      .getMany();
    const ro: PaginatedRo<Follow> = {
      totalResults: count,
      limit: limit,
      page: page,
      pageCount: Math.ceil(count / limit),
      pageResultsCount: followers.length,
      pageResults: followers
    };
    return ro;
  }
  public async getFollowingPaginated(id: number, limit: number, page: number) {
    const qb = this.followerRepository
      .createQueryBuilder('follow')
      .leftJoin('follow.follower', 'user')
      .where('user.id = :id', {id})
      .leftJoin('follow.following', 'following')
      .addSelect('following.username')
      .leftJoinAndSelect('user.avatar', 'avatar');
    const count = await qb.getCount();
    const following = await qb
      .take(limit)
      .skip(page * limit)
      .getMany();
    const ro: PaginatedRo<Follow> = {
      totalResults: count,
      limit: limit,
      page: page,
      pageCount: Math.ceil(count / limit),
      pageResultsCount: following.length,
      pageResults: following
    };
    return ro;
  }
  /*public async getFollowingGdb(username: string) {
    let followers = [];
    try {
      this.logger.log('transaction begin');
      let result = await this.neo4jService.write(`
        MATCH (u:User)-[:FOLLOWS]->(x:User)
        WHERE u.username = $user
        RETURN x.username
      `,
        { user: username}
      );
      result.records.forEach((value) => {
        this.logger.log(value.values().next().value);
        followers.push(value);
      });
    } catch (err) {
      this.logger.log(err);
    } finally {
      //this.neo4jService.
      this.logger.log('transaction finally');
    }
    return followers;
  }*/
  public async createFollow(username: string, toFollowUsername: string) {
    /*try {
      this.logger.log('transaction begin');
      await this.neo4jService.write(`
        MATCH (u:User)
        WHERE u.username = $user
        MERGE (following:User {username: $following})
        MERGE (u)-[:FOLLOWS]->(following)
      `,
        { user: username, following: toFollowUsername }
      );
    } catch (err) {
      this.logger.log(err);
    } finally {
      //this.neo4jService.
      this.logger.log('transaction finally');
    }*/
    const user = await this.userRepository.findOne({where: [{username: username}]});
    const toFollow = await this.userRepository.findOne({where: [{username: toFollowUsername}]});
    if(user.following === undefined) {
      user.following = [];
    }
    if(toFollow.followers === undefined) {
      toFollow.followers = [];
    }
    try {
      const existingFollow = await this.followerRepository.findOne({where: [{following: toFollow, follower: user}]});
      if(existingFollow) {
        return existingFollow;
      }
    }
    catch (e) {
      this.logger.log(e);
    }
    const follow = await this.followerRepository.create({following: toFollow, follower: user});
    return await this.followerRepository.save(follow);
    }
  public async removeFollow(username: string, toUnfollowUsername: string) {
    /*try {
      const res = await this.neo4jService.write(`
        MATCH (u:User), (following:User)
        WHERE u.username = $username AND following.username = $follow
        MATCH (u)-[r:FOLLOWS]->(following)
        DELETE r
      `, {username: username, follow: toUnfollowUsername});
    } catch (err) {
      this.logger.error(err);
    }*/
    const user = await this.userRepository.findOne({where: [{username: username}]});
    const toUnfollow = await this.userRepository.findOne({where: [{username: toUnfollowUsername}]});
    const unfollow = await this.followerRepository.findOne(
      {
        where: [{following: toUnfollow, follower: user}]
      });
    return await this.followerRepository.remove(unfollow);
  }

  public async getCommunities(id: number) {
    return await this.communityRepository.createQueryBuilder('c')
      .leftJoinAndSelect('c.members', 'users')
      .where('users.id = :id', {id})
      .addSelect('c.name')
      .leftJoinAndSelect('c.photo', 'photo')
      .addSelect('c.about')
      .getMany();
  }
}

/**
 * The following commented out functions were utility functions used to
 * create a new Neo4j graph database filled with data from the existing
 * relational db data from pgsql store
 */

/*  public async _upUsers() {
    const users = await this.userRepository.find({relations: ['following', 'posts', 'communities', 'followers']});
    const usernames = users.map(user => user.username);
    try {
      const res = await this.neo4jService.write(`
        UNWIND $usernames AS username
        MERGE (user:User {username: username})
      `, {usernames: usernames});
    } catch (e) {
      this.logger.error(e);
    } finally {

    }
  }
  public async _upUsersPosts() {
    const users = await this.userRepository.find({relations: ['following', 'posts', 'communities', 'followers']});
    for(const user of users) {
      const posts = await this.postRepository.find({where: [{author: user}]});
      const postSlugs = posts.map(post => post.slug);
      try {
        const res = await this.neo4jService.write(`
        MATCH (user:User)
        WHERE user.username = $username
        UNWIND $posts AS post
        MERGE (p:Post {slug: post})<-[:POSTED]-(user)
      `, {posts: postSlugs, username: user.username});
      } catch (e) {
        this.logger.error(e);
      } finally {

      }
    }
  }
  public async _upFollows() {
    const users = await this.userRepository.find({relations: ['following', 'posts', 'communities', 'followers']});
    for(const user of users) {
      const follows = await this.followerRepository.find({where: [{follower: user}], relations: ['follower', 'following']});
      const following = follows.map(follow => follow.following);
      const followingUsernames = following.map(user => user.username);
      this.logger.log(followingUsernames.toString());
      try {
        const res = await this.neo4jService.write(`
        UNWIND $follows AS following
        MATCH (user:User), (follow:User)
        WHERE user.username = $username AND follow.username = following
        MERGE (user)-[:FOLLOWS]->(follow)
      `, {follows: followingUsernames, username: user.username});
      } catch (e) {
        this.logger.error(e);
      } finally {

      }
    }
  }
  public async _upUsersCommunities() {
    const users = await this.userRepository.find({relations: ['following', 'posts', 'communities', 'followers']});
    for(const user of users) {
      this.logger.log(user.communities.map(c => c.name).toString());
      const communities = user.communities.map(c => c.name);
      //const communities = await this.communityRepository.find()
      //const following = follows.map(follow => follow.following);
      //const followingUsernames = following.map(user => user.username);
      //this.logger.log(followingUsernames.toString());
      try {
        const res = await this.neo4jService.write(`
          MATCH (user:User)
          WHERE user.username = $username
          UNWIND $communities AS community
          MERGE (c:Community {name: community})
          MERGE (c)<-[:MEMBER_OF]-(user)
        `, {username: user.username, communities: communities});
      } catch (e) {
        this.logger.error(e);
      } finally {

      }
    }
  }
  public async _upUserFavorites() {
    const users = await this.userRepository.find({relations: ['following', 'posts', 'communities', 'followers', 'favorites']});
    for(const user of users) {
      //this.logger.log(user.communities.map(c => c.name).toString());
      const favoriteIds = user.favorites.map(f => f.postId);
      const favorites = await this.postRepository.findByIds(favoriteIds);
      const favoriteSlugs = favorites.map(favorite => favorite.slug);
      //const communities = await this.communityRepository.find()
      //const following = follows.map(follow => follow.following);
      //const followingUsernames = following.map(user => user.username);
      //this.logger.log(followingUsernames.toString());
      try {
        const res = await this.neo4jService.write(`
          MATCH (user:User)
          WHERE user.username = $username
          UNWIND $favorites AS favorite
          MERGE (p:Post {slug: favorite})
          MERGE (p)<-[:FAVORITES]-(user)
        `, {username: user.username, favorites: favoriteSlugs});
      } catch (e) {
        this.logger.error(e);
      } finally {

      }
    }
  }
  public async _upPostCommunity() {
    const posts = await this.postRepository.find({relations: ['community']});
    for(const post of posts) {
      if (post.community) {
        const community = post.community.name;
        try {
          const res = await this.neo4jService.write(`
          MATCH (p:Post)
          WHERE p.slug = $post
          MERGE (c:Community {name: $community})
          MERGE (p)-[:POSTED_IN]->(c)
        `, { post: post.slug, community: community });
        } catch (e) {
          this.logger.error(e);
        } finally {

        }
      }
    }
  }
  public async _upPostCategories() {
    const posts = await this.postRepository.find({relations: ['categories']});
    for(const post of posts) {
      if (post.categories) {
        const categories = post.categories.map(category => category.name);
        try {
          const res = await this.neo4jService.write(`
          MATCH (p:Post)
          WHERE p.slug = $post
          UNWIND $categories AS category
          MERGE (c:Category {name: category})
          MERGE (p)-[:HAS_TOPIC]->(c)
        `, { post: post.slug, categories: categories });
        } catch (e) {
          this.logger.error(e);
        } finally {

        }
      }
    }
  }
  public async graphTest() {
    const posts = await this.postRepository.find({relations: ['categories']});
    for(const post of posts) {
      if (post.categories) {
        const categories = post.categories.map(category => category.name);
        try {
          const res = await this.neo4jService.write(`
          MATCH (p:Post)
          WHERE p.slug = $post
          UNWIND $categories AS category
          MERGE (c:Category {name: category})
          MERGE (p)-[:HAS_TOPIC]->(c)
        `, { post: post.slug, categories: categories });
        } catch (e) {
          this.logger.error(e);
        } finally {

        }
      }
    }
    const users = await this.userRepository.find({relations: ['following', 'posts', 'communities', 'followers', 'favorites']});
    for(const user of users) {
      //this.logger.log(user.communities.map(c => c.name).toString());
      const favoriteIds = user.favorites.map(f => f.postId);
      const favorites = await this.postRepository.findByIds(favoriteIds);
      const favoriteSlugs = favorites.map(favorite => favorite.slug);
      //const communities = await this.communityRepository.find()
      //const following = follows.map(follow => follow.following);
      //const followingUsernames = following.map(user => user.username);
      //this.logger.log(followingUsernames.toString());
      try {
        const res = await this.neo4jService.write(`
          MATCH (user:User)
          WHERE user.username = $username
          UNWIND $favorites AS favorite
          MERGE (p:Post {slug: favorite})
          MERGE (p)<-[:FAVORITES]-(user)
        `, {username: user.username, favorites: favoriteSlugs});
      } catch (e) {
        this.logger.error(e);
      } finally {

      }
    }
    /!*const singleUser = await this.userRepository.findOne({where: [{username: 'steven'}],relations: ['following', 'posts', 'communities']});
    const userPosts = singleUser.posts.map(post => post.slug);
    for(const user of users) {
      const postSlugs = user.posts.map(post => post.slug);
      //const following = user.followers.map(follow => follow.following);
      //const followingNames = following.map(f => f.username);
      const c = await this.followerRepository.find({where: [{follower: user}], relations: ['follower', 'following']});
     // const followingNames = c.map(f => f.following);
      const following = c.map(follow => follow.following);
      const followingNames = following.map(f => f.username);
      try {
        this.logger.log('transaction begin');
        /!*const res = await this.neo4jService.write(
          `
          MATCH (user:User)
          WHERE user.username = $username
          FOREACH(post IN $posts | MERGE (p:Post {slug: post})<-[:AUTHOR_OF]-(user))`,
          { username: user.username, posts: postSlugs }
        );*!/
        const res = await this.neo4jService.write(`
        MATCH (user:User)
        WHERE user.username = $username
        FOREACH(following IN $following |
        MERGE (user)-[:FOLLOWS]->(follow:User {username: following}))
      `, {username: user.username, following: followingNames});
        this.logger.log(res.summary.database);
        this.logger.log(res.summary.query);
        this.logger.log(res.summary.resultAvailableAfter);
        this.logger.log(res.summary.resultConsumedAfter);
        this.logger.log(res.summary.updateStatistics);
        this.logger.log(res.summary.counters);
        res.records.forEach(value => this.logger.log(value.entries().next().value));
      } catch (err) {
        this.logger.log(err);
      } finally {
        //this.neo4jService.
        this.logger.log('transaction finally');
      }
    }*!/
    const usernames = users.map(user => user.username);

    /!*const userdata = users.map((user) => {
      return {
        following: user.following,
        posts: user.posts,
        communities: user.communities
      };
    });
    const follows = users.map(user => user.following);
    const followings = follows.map(follow => follow)*!/
    /!*try {
      this.logger.log('transaction begin');
      const res = await this.neo4jService.write(
        `FOREACH(n IN $name | CREATE (me:User {username: n}))`, { name: usernames }
      );
      const following = await this.neo4jService.write(`

      `);
      this.logger.log(res.summary.database);
      this.logger.log(res.summary.query);
      this.logger.log(res.summary.resultAvailableAfter);
      this.logger.log(res.summary.resultConsumedAfter);
      this.logger.log(res.summary.updateStatistics);
      this.logger.log(res.summary.counters);
      res.records.forEach(value => this.logger.log(value.entries().next().value));
    } catch (err) {
      this.logger.log(err);
    } finally {
      //this.neo4jService.
      this.logger.log('transaction finally');
    }*!/
  }*/

import { Injectable, Logger } from "@nestjs/common";
import { Repository } from "typeorm";
import { Community } from "./community.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { CreateCommunityDto } from "./dto/create-community.dto";
import { CreatePostDTO } from "../posts/dto/create-post.dto";
import { PostEntity } from "../posts/post.entity";
import { FilesService } from "../files/files.service";
//import { Neo4jService } from "nest-neo4j/dist";
import { UpdateCommunityDto } from "./dto/update-community.dto";

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);
  constructor(
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    private readonly fileService: FilesService,
    //private readonly neo4jService: Neo4jService
  ) { }

  public async createCommunity(input: CreateCommunityDto, user: User, pic?: Express.Multer.File) {
    //Check if a community with UNIQUE 'name' already exists in DB
    const c = await this.communityRepository.findOne({where: [{name: input.name}]});
    if(c) {
      //If exists return and don't create a new community.
      return;
    }
    const community = new Community();
    community.name = input.name;
    community.posts = [];
    community.members = [user];
    community.about = input.about || '';
    if(pic) {
      community.photo = await this.fileService.uploadFile(pic.buffer, pic.originalname);
    }/*try {
      const res = await this.neo4jService.write(`
        MATCH (u:User {username: $username})
        MERGE (c:Community {name: $name})
        MERGE (c)<-[:MEMBER_OF]-(u)
      `, {username: user.username, name: input.name});
    } catch (err) {
      this.logger.error(err);
    }*/
    return await this.communityRepository.save(community);
  }
  public async updateCommunity(name: string, input: UpdateCommunityDto, user: User) {
    const community = await this.communityRepository.findOne({where: [{name: name}]});
    return await this.communityRepository.save({
      ...community,
      ...input
    });
  }

  public async joinCommunity(name: string, user: User) {
    const foundUser = await this.userRepository.findOne(user.id, {relations: ['communities']});
    const community = await this.communityRepository.findOne({
      where: [{name: name}],
      relations: ['members']});
    if(foundUser.communities === undefined) {
      foundUser.communities = [];
    }
    if(foundUser.communities.findIndex(c => c.id===community.id) >= 0) {
      return community;
    }
    /*try {
      const res = await this.neo4jService.write(`
        MATCH (u:User {username: $user})
        MATCH (c:Community {name: $community})
        MERGE (u)-[:MEMBER_OF]->(c)
      `, {user: foundUser.username, community: community.name});
    } catch (err) {
      this.logger.error(err);
    }*/
    community.members.push(foundUser);
    community.count++;
    return await this.communityRepository.save(community);
  }
  public async leaveCommunity(name: string, user: User) {
    const foundUser = await this.userRepository.findOne(user.id, {relations: ['communities']});
    const community = await this.communityRepository.findOne({
      where: [{name: name}],
      relations: ['members']});
    const communityIndex = foundUser.communities.findIndex(c => c.id===community.id);
    if(communityIndex < 0) {
      return community;
    }
    /*try {
      const res = await this.neo4jService.write(`
        MATCH (u:User {username: $user})-[r:MEMBER_OF]->(c:Community {name: $community})
        DELETE r
      `, {user: foundUser.username, community: community.name});
    } catch (err) {
      this.logger.error(err);
    }*/
    foundUser.communities = foundUser.communities.filter(c => c.id !== community.id);
    community.members = community.members.filter(u => u.id !== foundUser.id);
    community.count--;
    return await this.userRepository.save(foundUser);
  }

  public async addPhoto(name: string, fileBuffer: Buffer, fileName: string) {
    this.logger.log(name, fileName);
    const community = await this.communityRepository.findOne({where: [{name: name}]});
    this.logger.log(community.id + ' :: ' + community.name);
    if(community.photo) {
      this.logger.log('photo already exists. removing....');
      await this.communityRepository.update(community.id, {
        ...community,
        photo: null
      });
      await this.fileService.removeFile(community.photo.id);
    }
    this.logger.log('upload file....');
    const photo = await this.fileService.uploadFile(fileBuffer, fileName);
    await this.communityRepository.update(community.id, {
      ...community,
      photo
    });
    return photo;
  }
  public async removePhoto(name: string) {
    const community = await this.communityRepository.findOne({where: [{name: name}]});
    const fileId = community.photo?.id;
    if(fileId) {
      await this.communityRepository.update(community.id, {
        ...community,
        photo: null
      });
      await this.fileService.removeFile(fileId);
    }
  }

  public async searchCommunities(search: string) {
    this.logger.debug(search);
    const communities = await this.communityRepository
      .createQueryBuilder('community')
      .select(['community.name', 'community.about'])
      .where(`to_tsvector('simple', community.name) @@ to_tsquery('simple', :search)`,
        {search: `${search}:*`})
      .leftJoinAndSelect('community.photo', 'photo')
      .getMany();
    return communities;
  }

  public async getAllCommunities() {
    return this.communityRepository
      .createQueryBuilder('c')
      .leftJoin('c.members', 'members')
      .addSelect('members.username')
      .leftJoinAndSelect('c.photo',  'photo')
      .addSelect('c.about')
      .getMany();
  }

  public async getCommunity(name: string, user: User) {
    const foundUser = await this.userRepository.findOne(user.id, {relations: ['communities']});
    const community = await this.communityRepository.findOne({
      where: [{name: name}],
      relations: ['members', 'posts', 'photo']});
    const photo = community.photo?.url;
    this.logger.log(community.photo?.url);
    const about = community.about;
    this.logger.log('loc2');
    const posts = await this._getPosts(name);
    const members = await this.getMembers(name);
    this.logger.log('after after');
    const isMember = foundUser.communities.findIndex(c => c.name === name) >= 0;
    this.logger.log(isMember);
    return {posts, members, isMember, photo, about};
  }
  public getTopCommunitiesQuery() {
    return this.communityRepository
      .createQueryBuilder('c')
      .select(['c.id', 'c.name', 'c.count'])
      .orderBy({count: 'DESC'});
  }
  public async getTopCommunities(amount: number) {
    return await this.communityRepository
      .createQueryBuilder('c')
      .select(['c.id', 'c.name', 'c.count'])
      .orderBy({count: 'DESC'})
      .getMany();
  }
  public async getTopPostsFromAll() {
    return await this.getTopCommunitiesQuery()
      .leftJoinAndSelect('c.posts', 'posts')
      .leftJoinAndSelect('posts.attachments', 'attachments')
      .getMany();
  }
  public async getMembers(name: string) {
    const community = await this.communityRepository.findOne({where: [{name: name}], relations: ['members']});
    this.logger.log('gm' + community.id);
    const users = await this.userRepository.findByIds(community.members.map(m => m.id));
    this.logger.log(users.length);
    return await this.communityRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.members', 'members')
      .leftJoinAndSelect('members.avatar', 'avatar')
      .where('c.name = :name', {name})
      .getMany();
  }
  public getPostsQuery(name: string) {
    return this.communityRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.posts', 'posts')
      .where('c.name = :name', {name})
      .leftJoinAndSelect('posts.author', 'author')
      .leftJoinAndSelect('author.avatar', 'avatar')
      .leftJoinAndSelect('posts.attachments', 'attachments')
      .leftJoinAndSelect('posts.comments', 'comments');
  }
  public async _getPosts(name: string, sort?: string) {
    const community = await this.communityRepository.findOne({where: [{name: name}], relations: ['posts', 'members']});

    const postIds = community.posts.map(post => post.id);
    if(!postIds.length) {
      this.logger.log('no ids')
      return [];
    }
    let sorting: string = 'post.createdAt';
    if(sort && sort.toLowerCase() === 'recent') {
      sorting = 'post.createdAt';
    }
    if(sort && sort.toLowerCase() === 'top') {
      sorting = 'post.favoriteCount';
    }

    const postsQ = await this.postRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...ids)', {ids: [...postIds]})
      .leftJoin('post.author', 'author')
      .addSelect(['author.username', 'author.createdAt'])
      .leftJoinAndSelect('author.avatar', 'avatar')
      .leftJoinAndSelect('post.attachments', 'attachments')
      .leftJoinAndSelect('post.categories', 'categories')
      .leftJoin('post.community', 'community')
      .addSelect('community.name')

      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('comments.commenter', 'commenter')
      .leftJoinAndSelect('commenter.avatar', 'commenter-avatar')
      .orderBy(`${sorting}`, 'DESC');
    this.logger.log('after');
    return postsQ.getMany();
  }
  public async getTrendingPosts(name: string) {
    return await this.getPostsQuery(name)
      .addOrderBy('posts.favoriteCount', 'ASC')
      .getMany();
  }
}

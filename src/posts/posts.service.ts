import { Injectable, Logger } from "@nestjs/common";
import { DeleteResult, Repository, SelectQueryBuilder } from "typeorm";
import { PostEntity } from "./post.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { CreatePostDTO } from "./dto/create-post.dto";
import { User } from "../user/user.entity";
import { UpdatePostDTO } from "./dto/update-post.dto";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { Comment } from "./comment.entity";
import { formatDistanceToNow } from 'date-fns';
import { Favorite } from "../user/favorite.entity";
import { Community } from "../user/community.entity";
import { FilesService } from "../files/files.service";
import { FileEntity } from "../files/file.entity";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { Category } from "./category.entity";
import { query } from "express";
import { IPaginationOptions } from "../paginate/interface/pagination-options.interface";
import { Pagination } from "../paginate/pagination";
//import { Neo4jService } from "nest-neo4j/dist";
import { PaginatedPostsRo } from "./interface/post.interface";
//import { Favorite } from "../user/favorite.entity";
interface PaginationOptions {
  limit?: number;
  page?: number;
}
@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: Repository<PostEntity>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly fileService: FilesService,
    //private readonly neo4jService: Neo4jService
  ) {}

  public getPostQueryBuilder(alias: string) {
    return this.postsRepository
      .createQueryBuilder(alias);
  }
  public postQbCommonRelations() {
    return this.getPostQueryBuilder('post')
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
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('comments.createdAt', 'ASC');
  }


  public async getPostsPaginated(limit: number, page: number) {
    const qb = this.postQbCommonRelations();
    const rac = await qb.getManyAndCount();

    const count = await qb.getCount();
    const posts = await qb
      .take(limit)
      .skip(page * limit)
      .getMany();
    const ro: PaginatedPostsRo = {
      totalResults: count,
      limit: limit,
      page: page,
      pageCount: Math.ceil(count / limit),
      pageResultsCount: posts.length,
      pageResults: posts
    };
    return ro;
  }

  public async paginated(qb: SelectQueryBuilder<PostEntity>, options: PaginationOptions = {limit: 10, page: 0}) {
    const counted = await qb.getManyAndCount();
    return qb.limit(options.limit).skip(options.page * options.limit);
  }

  /*
  Not really used. API only.
   */
  public async getPost(id: number): Promise<PostEntity> {
    const post = await this.postsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'author')
      .leftJoinAndSelect('p.comments', 'comments')
      .leftJoinAndSelect('p.attachments', 'attachments')
      .leftJoinAndSelect('p.categories', 'categories')
      .andWhere('p.id = :id', {id})
      .getOne();
    //const timeSince = formatDistanceToNow(post.createdAt);
    //return {post, timeSince}
    return post;
  }

  /*
  Possibly going to be removed
   */
  public async getBySlug(slug: string): Promise<PostEntity> {
    const post = await this.postsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'author')
      .leftJoinAndSelect('author.avatar', 'author-avatar')
      .leftJoinAndSelect('p.comments', 'comments')
      .leftJoinAndSelect('comments.commenter', 'commenter')
      .leftJoinAndSelect('commenter.avatar', 'avatar')
      .leftJoinAndSelect('p.attachments', 'attachments')
      .leftJoinAndSelect('p.categories', 'categories')
      .where('p.slug = :slug', {slug})
      .getOne();
    return post;
  }

  public async searchTitles(search: string) {
    return await this.postQbCommonRelations()
      .where('to_tsvector(post.name) @@ to_tsquery(:search)', {search})
      .getMany();
  }

  public async searchCategories(search: string) {
    const query = search.trim().split(/,/g);
    const tags = await this.categoryRepository
      .createQueryBuilder('category')
      .select('category.name')
      .where('category.name IN (:...names)', {names: query})
      .getMany();
    return tags;
  }

  /*
  Will probably be removed
   */
  public async searchPostContent(search: string) {
    this.logger.debug(search);
    const query = search.trim().replace(/ /g, ' & ');
    //return this.postsRepository.find();
    return await this.postsRepository
      .createQueryBuilder('post')
      .where(
        `to_tsvector('simple', post.name) @@ to_tsquery('simple', :search)`
        , {search: `${query}:*`})
      .leftJoin('post.author', 'author')
      .addSelect(['author.username', 'author.createdAt'])
      .leftJoinAndSelect('author.avatar', 'avatar')
      .leftJoinAndSelect('post.attachments', 'attachments')
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('comments.commenter', 'commenter')
      .leftJoinAndSelect('commenter.avatar', 'commenter-avatar')
      //.addSelect('commenter.username')
      .leftJoin('post.community', 'community')
      .addSelect('community.name')
      .leftJoinAndSelect('post.categories', 'tags')
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('comments.createdAt', 'ASC')
      .getMany();
  }
  public async getPostsWithSomeCategories(topics: string[], pagination?: {page: number, perPage: number}) {
    this.logger.log(topics);
    let tags: Category[];
    if(pagination) {
      tags = await this.categoryRepository.createQueryBuilder('c')
        .where('c.name IN (:...names)', {names: topics})
        .leftJoinAndSelect('c.posts', 'post')
        .limit(pagination.perPage)
        .offset(pagination.perPage * pagination.page)
        .getMany();
    } else {
      tags = await this.categoryRepository.createQueryBuilder('c')
        .where('c.name IN (:...names)', { names: topics })
        .leftJoinAndSelect('c.posts', 'post')
        .getMany();
    }
    this.logger.log(tags.length);
    this.logger.log(tags.map(t => t.id));
    let tagSet: Set<number> = new Set();
    tags.map(tag => tag.posts.forEach((post) => {
      console.log(post.id);
      this.logger.log(post.id);
      tagSet.add(post.id);
    }))
    this.logger.log(Array.from(tagSet));
    const posts = await this.postQbCommonRelations().whereInIds(Array.from(tagSet)).getMany();
    return posts;
    return await this.postsRepository.findByIds(Array.from(tagSet));
  }
  public async getByCategory(name: string) {
    const tag = await this.categoryRepository.findOne({where: [{name: name}], relations: ['posts']});
    if(!tag) {
      return [];
    }
    const postIds = tag.posts.map((post) => post.id);
    return await this.postsRepository.findByIds(postIds, {relations: ['author', 'comments', 'categories', 'community', 'attachments']});
  }

  public async createPost(input: CreatePostDTO, user: User, files: Array<Express.Multer.File>): Promise<PostEntity> {
    const post = new PostEntity();
    const uploadedFiles = files ? await this.fileService.uploadFiles(files) : [];
    post.categories = [];

      for (let category of input.categories) {
        const tag = await this.categoryRepository.findOne({ where: [{ name: category }] });
        if (tag) {
          post.categories.push(tag);
        } else {
          const newTag = await this.categoryRepository.create({ name: category });
          post.categories.push(newTag);
        }
      }
    const tags = post.categories.map(tag => tag.name);
    this.logger.log(tags.toString());
    const community = await this.communityRepository.findOne({relations: ['posts'], where: [{name: input.community}]});
    post.community = community;
    post.author = user;
    post.name = input.name;
    post.content = input.content;
    post.attachments = uploadedFiles;
    post.comments = [];
    post.favorites = [];
    post.favoriteCount = 0;
    const slug = this.slugify(input.name);
    post.slug = slug;//this.slugify(input.name);
    return await this.postsRepository.save(post);
  }

  public async updatePost(id: number, input: UpdatePostDTO, user: User) {
    const post = await this.postsRepository.findOne(id);
    const newPost = {...post};
    newPost.name = input.name ? input.name : post.name;
    newPost.content = input.content ? input.content : post.content;
    newPost.categories = newPost.categories ? newPost.categories : [];
    for(let category of input.categories) {
      const tag = await this.categoryRepository.findOne({where: [{name: category}]});
      if(tag) {
        newPost.categories.push(tag);
      } else {
        const newTag = await this.categoryRepository.create({name: category});
        newPost.categories.push(newTag);
      }
    }
    /*try {
      const res = await this.neo4jService.write(`
        UNWIND $tags AS tag
        MERGE (t:Category {name: tag})<-[:HAS_TOPIC]-(p:Post {slug: $slug})
      `, {tags: newPost.categories.map(c => c.name), slug: newPost.slug});
    } catch (err) {
      console.log(err);
    }*/
    return await this.postsRepository.save(newPost);
  }

  public async removePost(id: number): Promise<DeleteResult> {
    const post = await this.postsRepository.findOne(id);
    /*try {
      const res = await this.neo4jService.write(`
        MATCH (p:Post {slug: $post})
        DETACH DELETE p
      `, {post: post.slug});
    } catch (err) {
      console.log(err);
    }*/
    return await this.postsRepository
      .createQueryBuilder('e')
      .delete()
      .where('id = :id',{id})
      .execute();
  }

  public async addComment(id: number, input: CreateCommentDto, user: User): Promise<PostEntity> {
    const post = await this.postsRepository.findOne(id, {relations: ["comments"]});
    const comment = new Comment();
    comment.content = input.content;
    comment.commenter = user;
    post.comments.push(comment);
    await this.commentRepository.save(comment);
    return await this.postsRepository.save(post);
  }

  public async updateComment(id: number, input: UpdateCommentDto, user: User): Promise<PostEntity> {
    const comment = await this.commentRepository.findOne(id, {relations: ['post']});
    const post = comment.post;
    const newComment = {...comment};
    newComment.content = input.content ? input.content : comment.content;
    await this.commentRepository.save(newComment);
    return await this.postsRepository.save(post);
  }

  public async removeComment(id: number, user: User) {
    const comment = await this.commentRepository.findOne(id);
    return await this.commentRepository.remove(comment);
  }

  public async getComments(id: number) {
    const post = await this.postsRepository.findOne(id, {relations: ["comments"]});
    return post.comments;
  }

  public async addFavorite(id: number, user: User) {
    let post = await this.postsRepository.findOne(id);
    const foundUser = await this.userRepository.findOne(user.id);
    const existingFav = await this.favoriteRepository.findOne({
      where: [{post: post, user: user}]
    });
    this.logger.log(existingFav ? 'already liked' : 'not yet liked');
    if(existingFav) {
      this.logger.log('already liked, cant like again');
      return post;
    }
    //if(!existingFav) {
    /*try {
      const res = await this.neo4jService.write(`
        MATCH (p:Post {slug: $post})
        MATCH (u:User {username: $username})
        MERGE (p)<-[:FAVORITES]-(u)
      `, {post: post.slug, username: user.username});
    } catch (err) {
      this.logger.error(err);
    }*/
      const favorite = await this.favoriteRepository.create({ post: post, user: foundUser });
      const fav = this.favoriteRepository.save(favorite);
      fav.then(() => post.favoriteCount++);
      return await this.postsRepository.save(post);
  }

  public async removeFavorite(id: number, user: User) {
    const post = await this.postsRepository.findOne(id);
    const favorite = await this.favoriteRepository.findOne({
      where: [{postId: id, userId: user.id}]
    });
    this.logger.log(favorite ? 'already liked' : 'not liked');

    if(!favorite) {
      this.logger.log(!favorite ? 'not liked so no like to remove' : 'post liked');
      return post;
    }
    const remove = this.favoriteRepository.remove(favorite);
    remove.then(() => post.favoriteCount--);
    /*try {
      const res = await this.neo4jService.write(`
        MATCH (p:Post {slug: $post})<-[r:FAVORITES]-(u:User {username: $username})
        DELETE r
      `, {post: post.slug, username: user.username});
    } catch (err) {
      this.logger.error(err);
    }*/
    return await this.postsRepository.save(post);
  }
  public async getAllCategories() {
    /*let ro = {};
    try {
      this.logger.log('transaction begin');
      let result = await this.neo4jService.read(`
        MATCH (c:Category)-[r]-(:Post)
        WITH c, count(r) AS relCount
        ORDER BY relCount DESC
        RETURN c.name, relCount
      `);
      //const recs = result.records;
      result.records.forEach((record) => {
        /!*let a = record.map((d) => {
          this.logger.log('**');

          this.logger.log(d['c.name']);
          this.logger.log(d['relCount']);
          this.logger.log('**');
          return [d[0], d[1]];
        })
        this.logger.log(a);*!/
        let a = [];
        for (const key of record.keys) {
          this.logger.log(key);
          this.logger.log(<string>key + ' = ' + record.get(key));
          //ro[record.get(key)] = record.get(key).low;
          a.push(record.get(key));
        }
        ro[a[0]] = a[1].low;
        this.logger.log('KM :: ' + record.keys.map(v => v));
        this.logger.log('VN :: ' + record.values().next().value);
        //record.map((field) => followers.push(field))
        this.logger.log('Record entries :: ' + record.entries().next().value);
        //this.logger.log(followers);
        //followers.push(record);
      });
      //return recs.values();
    } catch (err) {
      this.logger.log(err);
    } finally {
      this.logger.log('transaction finally');
    }
    return ro;*/
    let ro = {};
    let tags = await this.categoryRepository
      .createQueryBuilder('c')
      .select('c.name')
      .getMany();
    tags.forEach(tag => ro[tag.name]=5);
    return ro;
  }

  public slugify(name: string) {
    return name.replace(/\s/g, '-').toLowerCase();
  }
}

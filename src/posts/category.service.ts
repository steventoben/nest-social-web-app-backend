import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "./category.entity";
import { Repository } from "typeorm";
import { PostEntity } from "./post.entity";
import { Neo4jService } from "nest-neo4j/dist";

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    //private readonly neo4jService: Neo4jService
  ) {

  }
  public async getAllCategories() {
    /*try {
      this.logger.log('transaction begin');
      let result = await this.neo4jService.read(`
        MATCH (c:Category)-[r]-(:Post)
        WITH c, count(r) AS relCount
        ORDER BY relCount DESC
        RETURN c.name, relCount
      `);
      const recs = result.records;
      this.logger.log(recs);
      this.logger.log(recs.map(r => r.map(value => value)))
      return recs.values();
    } catch (err) {
      this.logger.log(err);
    } finally {
      this.logger.log('transaction finally');
    }*/
    let ro = [];
    let tags = await this.categoryRepository
      .createQueryBuilder('c')
      .select('c.name')
      .getMany();
    tags.forEach(tag => ro.push({name: tag.name, count: 5}));
    return ro;
  }
}

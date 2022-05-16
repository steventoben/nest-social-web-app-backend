import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { PostEntity } from "./post.entity";

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({unique: true})
  name: string;
  @ManyToMany(() => PostEntity, (post) => post.categories)
  posts: PostEntity[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn, JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany, OneToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { User } from "../user/user.entity";
import { Comment } from "./comment.entity";
import { Favorite } from "../user/favorite.entity";
import { Category } from "./category.entity";
import { Community } from "../user/community.entity";
import { FileEntity } from "../files/file.entity";

@Entity()
export class PostEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  content: string;
  @OneToMany(() => FileEntity, (file) => file.post, {eager: true , nullable: true, cascade: true})
  attachments: FileEntity[];
  @ManyToOne(() => User, (user) => user.posts)
  author: User;
  @Column()
  authorId: number;
  @ManyToOne(() => Community, (community) => community.posts)
  community: Community;
  @ManyToMany(() => Category, (category) => category.posts, {cascade: true})
  @JoinTable()
  categories: Category[];
  @OneToMany(() => Comment, (comment) => comment.post)
  @JoinColumn()
  comments: Comment[];
  @OneToMany(() => Favorite, (favorite) => favorite.post)
  favorites: Favorite[];
  @Column({default: 0})
  favoriteCount: number;
  @CreateDateColumn()
  createdAt: Date;
  @Column({nullable: true})
  slug: string;
}

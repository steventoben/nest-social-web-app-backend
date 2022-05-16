import {
  Column,
  CreateDateColumn,
  Entity, Index, JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { PostEntity } from "../posts/post.entity";
import { Expose } from "class-transformer";
import { Comment } from "../posts/comment.entity";
import { Follow } from "./follow.entity";
import { Favorite } from "./favorite.entity";
import { Community } from "./community.entity";
import { FileEntity } from "../files/file.entity";

@Index(['id', 'username'], {unique: true})
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  @Expose()
  id: number;
  @Column({unique: true})
  @Expose()
  username: string;
  @Column()
  password: string;
  @Column({nullable: true})
  @Expose()
  bio?: string;
  @JoinColumn()
  @OneToOne(() => FileEntity, {eager: true, nullable: true})
  avatar?: FileEntity;
  @OneToMany(() => PostEntity, (post) => post.author)
  @Expose()
  posts: PostEntity[];
  @OneToMany(() => Comment, (comment) => comment.commenter)
  @Expose()
  comments: Comment[];
  @OneToMany(() => Follow, (follow) => follow.follower)
  @Expose()
  followers: Follow[];
  @OneToMany(() => Follow, (follow) => follow.following)
  @Expose()
  following: Follow[];
  @OneToMany(() => Favorite, (favorite) => favorite.user)
  @Expose()
  favorites: Favorite[];
  @ManyToMany(() => Community, (community) => community.members, {cascade: true})
  @JoinTable()
  communities: Community[];
  @CreateDateColumn()
  createdAt: Date;
}

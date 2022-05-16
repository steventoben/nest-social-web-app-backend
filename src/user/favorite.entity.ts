import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { PostEntity } from "../posts/post.entity";

@Entity()
export class Favorite {
  @ManyToOne(() => User, (user) => user.favorites, {cascade: ['insert', 'update']})
  user: User;
  @PrimaryColumn()
  userId: number;
  @ManyToOne(() => PostEntity, (post) => post.favorites, {cascade: ['insert', 'update'], onDelete: 'CASCADE'})
  post: PostEntity;
  @PrimaryColumn()
  postId: number;
}

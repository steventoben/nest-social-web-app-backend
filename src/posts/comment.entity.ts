import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PostEntity } from "./post.entity";
import { User } from "../user/user.entity";

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  content: string;
  @ManyToOne(() => PostEntity, (post) => post.comments, {onDelete: 'CASCADE'})
  post: PostEntity;
  @ManyToOne(() => User, (user) => user.comments)
  commenter: User;
  @Column()
  commenterId: number;
  @CreateDateColumn()
  createdAt: Date;
}

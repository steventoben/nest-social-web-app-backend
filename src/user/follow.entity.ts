import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
//@Index(["followerId", "followingId"], {unique: true})
export class Follow {
  @PrimaryGeneratedColumn()
  id: number
  @ManyToOne(() => User, (user) => user.followers)
  follower: User;
  @Column()
  followerId: number;
  @ManyToOne(() => User, (user) => user.following)
  following: User;
  @Column()
  followingId: number;
  @CreateDateColumn()
  createdAt: Date;
}

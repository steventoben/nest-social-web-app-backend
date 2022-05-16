import { Column, Entity, JoinColumn, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { PostEntity } from "../posts/post.entity";
import { User } from "./user.entity";
import { FileEntity } from "../files/file.entity";

@Entity()
export class Community {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({unique: true})
  name: string;
  @JoinColumn()
  @OneToOne(() => FileEntity, {eager: true, nullable: true})
  photo?: FileEntity;
  @Column({nullable: true})
  about: string;
  @OneToMany(() => PostEntity, (post) => post.community)
  posts: PostEntity[]
  @ManyToMany(() => User, (user) => user.communities)
  members: User[]
  @Column({default: 0})
  count: number;
}

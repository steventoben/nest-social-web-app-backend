import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PostEntity } from "../posts/post.entity";

@Entity()
export class FileEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  url: string;
  @Column()
  key: string;
  @ManyToOne(() => PostEntity, (post) => post.attachments)
  post: PostEntity;
}

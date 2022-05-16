import { UserRo } from "../../user/interface/user.interface";

export interface CommentRo {
  id?: number;
  content: string;
  commenter: UserRo;
  createdAt?: Date;
}

import { isEmail, Length } from "class-validator";

export class CreateUserDto {

  username: string;
  @Length(8)
  password: string;

}

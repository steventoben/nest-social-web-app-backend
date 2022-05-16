
export interface AvatarRo {
  id?: number;
  url: string;
}
export interface UserRo {
  id?: number;
  username: string;
  avatar: AvatarRo;
}


export interface BatchCreateUsers {
  names: string[];
}

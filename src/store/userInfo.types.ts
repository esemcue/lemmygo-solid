export interface LemmyInstance {
  Url: string;
  Username: string;
  Password: string;
}

export interface User {
  Password: string;
  Email: string;
  LemmyInstances: LemmyInstance[];
}

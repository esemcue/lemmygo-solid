export interface lemmyInstance {
  Url: string;
  Username: string;
  Password: string;
}

export interface User {
  Password: string;
  Email: string;
  LemmyInstances: lemmyInstance[];
}

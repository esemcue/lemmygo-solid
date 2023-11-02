export interface lemmyInstance {
  Url: string;
  Username: string;
  Password: string;
}

export interface User {
  Name: string;
  Password: string;
  Email: string;
  LemmyInstances: lemmyInstance[];
}


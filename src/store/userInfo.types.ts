type Credentials = { [id: string]: string };

export interface User {
  Password: string;
  Email: string;
  Instances: Credentials;
}

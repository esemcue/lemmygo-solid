type Credentials = { [id: string]: string };

// Instance represents a Lemmy instance with its associated credentials
export interface Instance {
  url: string;
  credentials: Credentials;
}

// Instances is a collection of instances keyed by instance name/identifier
export type Instances = { [instanceName: string]: Instance };

export interface User {
  Password: string;
  Email: string;
  Instances: Instances;
}

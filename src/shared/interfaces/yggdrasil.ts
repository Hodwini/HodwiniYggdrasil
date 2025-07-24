export interface AuthenticateRequest {
  username: string;
  password: string;
  clientToken?: string;
  requestUser?: boolean;
}

export interface AuthenticateResponse {
  accessToken: string;
  clientToken: string;
  availableProfiles: Profile[];
  selectedProfile: Profile;
  user?: User;
}

export interface Profile {
  id: string;
  name: string;
  properties?: Property[];
}

export interface Property {
  name: string;
  value: string;
  signature?: string;
}

export interface User {
  id: string;
  username?: string;
  properties?: Property[];
}
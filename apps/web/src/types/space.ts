export type Role = 'host' | 'guest';

export type Space = {
  id: string;
  name: string;
  description: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
};

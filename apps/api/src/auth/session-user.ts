export type SessionUser = {
  readonly id: string;
  readonly sessionId: string;
  readonly email: string;
  readonly name: string;
  readonly pictureUrl: string | null;
};

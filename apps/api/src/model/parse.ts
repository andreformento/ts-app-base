export type ParseRejection = {
  readonly problems: readonly {
    readonly path: string;
    readonly message: string;
  }[];
};

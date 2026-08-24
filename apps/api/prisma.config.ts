import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/wire/db/schema.prisma',
  datasource: {
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});

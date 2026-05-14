/** Plain shapes for API / JSON — avoid importing model types from `@prisma/client`. */

export type DocumentListFields = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
};

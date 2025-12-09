import { builder } from "../builder";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Zod schemas para validación
export const CreateUserInput = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6).optional(),
  image: z.string().url().optional(),
});

export const UpdateUserInput = z.object({
  name: z.string().optional(),
  image: z.string().url().optional(),
  email: z.string().email().optional(),
});

// GraphQL Types
builder.prismaObject("User", {
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email"),
    name: t.exposeString("name", { nullable: true }),
    image: t.exposeString("image", { nullable: true }),
    emailVerified: t.expose("emailVerified", {
      type: "DateTime",
      nullable: true,
    }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    updatedAt: t.expose("updatedAt", { type: "DateTime" }),
    payments: t.relation("payments"),
    channels: t.relation("channels"),
    devices: t.relation("devices"),
    chats: t.relation("chats"),
  }),
});

// Queries
builder.queryField("user", (t) =>
  t.prismaField({
    type: "User",
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (query, _parent, args) => {
      return prisma.user.findUniqueOrThrow({
        ...query,
        where: { id: String(args.id) },
      });
    },
  }),
);

builder.queryField("users", (t) =>
  t.prismaField({
    type: ["User"],
    resolve: async (query) => {
      return prisma.user.findMany(query);
    },
  }),
);

// Mutations
builder.mutationField("createUser", (t) =>
  t.prismaField({
    type: "User",
    args: {
      input: t.arg({
        type: builder.inputRef("CreateUserInput").implement({
          fields: (t) => ({
            email: t.string({ required: true }),
            name: t.string(),
            password: t.string(),
            image: t.string(),
          }),
        }),
        required: true,
      }),
    },
    validate: {
      schema: CreateUserInput,
    },
    resolve: async (query, _parent, args) => {
      return prisma.user.create({
        ...query,
        data: {
          email: args.input.email,
          name: args.input.name,
          // En producción, hashear la contraseña aquí
          password: args.input.password,
          image: args.input.image,
        },
      });
    },
  }),
);

builder.mutationField("updateUser", (t) =>
  t.prismaField({
    type: "User",
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({
        type: builder.inputRef("UpdateUserInput").implement({
          fields: (t) => ({
            name: t.string(),
            email: t.string(),
            image: t.string(),
          }),
        }),
        required: true,
      }),
    },
    validate: {
      schema: UpdateUserInput,
    },
    resolve: async (query, _parent, args) => {
      return prisma.user.update({
        ...query,
        where: { id: String(args.id) },
        data: {
          ...(args.input.name && { name: args.input.name }),
          ...(args.input.email && { email: args.input.email }),
          ...(args.input.image && { image: args.input.image }),
        },
      });
    },
  }),
);

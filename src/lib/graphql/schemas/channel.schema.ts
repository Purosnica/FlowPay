import { builder } from "../builder";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Zod schemas
export const CreateChannelInput = z.object({
  name: z.string().min(1),
  visits: z.number().int().nonnegative().default(0),
  revenue: z.number().nonnegative().default(0),
  conversion: z.number().nonnegative().default(0),
  userId: z.string().optional(),
});

export const UpdateChannelInput = z.object({
  name: z.string().min(1).optional(),
  visits: z.number().int().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  conversion: z.number().nonnegative().optional(),
});

// GraphQL Types
builder.prismaObject("Channel", {
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    visits: t.exposeInt("visits"),
    revenue: t.exposeFloat("revenue"),
    conversion: t.exposeFloat("conversion"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    updatedAt: t.expose("updatedAt", { type: "DateTime" }),
    user: t.relation("user", { nullable: true }),
  }),
});

// Queries
builder.queryField("channels", (t) =>
  t.prismaField({
    type: ["Channel"],
    args: {
      userId: t.arg.id(),
    },
    resolve: async (query, _parent, args) => {
      return prisma.channel.findMany({
        ...query,
        where: {
          ...(args.userId && { userId: String(args.userId) }),
        },
        orderBy: {
          revenue: "desc",
        },
      });
    },
  }),
);

builder.queryField("channel", (t) =>
  t.prismaField({
    type: "Channel",
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (query, _parent, args) => {
      return prisma.channel.findUniqueOrThrow({
        ...query,
        where: { id: String(args.id) },
      });
    },
  }),
);

// Mutations
builder.mutationField("createChannel", (t) =>
  t.prismaField({
    type: "Channel",
    args: {
      input: t.arg({
        type: builder.inputRef("CreateChannelInput").implement({
          fields: (t) => ({
            name: t.string({ required: true }),
            visits: t.int(),
            revenue: t.float(),
            conversion: t.float(),
            userId: t.id(),
          }),
        }),
        required: true,
      }),
    },
    validate: {
      schema: CreateChannelInput,
    },
    resolve: async (query, _parent, args) => {
      return prisma.channel.create({
        ...query,
        data: {
          name: args.input.name,
          visits: args.input.visits,
          revenue: args.input.revenue,
          conversion: args.input.conversion,
          ...(args.input.userId && { userId: String(args.input.userId) }),
        },
      });
    },
  }),
);

import { builder } from "../builder";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Zod schemas
export const CreatePaymentInput = z.object({
  amount: z.number().positive(),
  status: z.enum(["PENDING", "RECEIVED", "OVERDUE", "CANCELLED"]).optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
  receivedAt: z.date().optional(),
  dueAt: z.date().optional(),
  userId: z.string().optional(),
});

export const UpdatePaymentInput = z.object({
  amount: z.number().positive().optional(),
  status: z.enum(["PENDING", "RECEIVED", "OVERDUE", "CANCELLED"]).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  receivedAt: z.date().optional(),
  dueAt: z.date().optional(),
});

// GraphQL Types
builder.prismaObject("Payment", {
  fields: (t) => ({
    id: t.exposeID("id"),
    amount: t.exposeFloat("amount"),
    status: t.expose("status", {
      type: "PaymentStatus",
    }),
    type: t.expose("type", {
      type: "PaymentType",
    }),
    receivedAt: t.expose("receivedAt", {
      type: "DateTime",
      nullable: true,
    }),
    dueAt: t.expose("dueAt", {
      type: "DateTime",
      nullable: true,
    }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    updatedAt: t.expose("updatedAt", { type: "DateTime" }),
    user: t.relation("user", { nullable: true }),
  }),
});

// Enums
builder.enumType("PaymentStatus", {
  values: ["PENDING", "RECEIVED", "OVERDUE", "CANCELLED"] as const,
});

builder.enumType("PaymentType", {
  values: ["INCOME", "EXPENSE"] as const,
});

// Queries
builder.queryField("payments", (t) =>
  t.prismaField({
    type: ["Payment"],
    args: {
      userId: t.arg.id(),
      status: t.arg({
        type: "PaymentStatus",
      }),
      type: t.arg({
        type: "PaymentType",
      }),
    },
    resolve: async (query, _parent, args) => {
      return prisma.payment.findMany({
        ...query,
        where: {
          ...(args.userId && { userId: String(args.userId) }),
          ...(args.status && { status: args.status }),
          ...(args.type && { type: args.type }),
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    },
  }),
);

builder.queryField("payment", (t) =>
  t.prismaField({
    type: "Payment",
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (query, _parent, args) => {
      return prisma.payment.findUniqueOrThrow({
        ...query,
        where: { id: String(args.id) },
      });
    },
  }),
);

// Mutations
builder.mutationField("createPayment", (t) =>
  t.prismaField({
    type: "Payment",
    args: {
      input: t.arg({
        type: builder.inputRef("CreatePaymentInput").implement({
          fields: (t) => ({
            amount: t.float({ required: true }),
            status: t.field({ type: "PaymentStatus" }),
            type: t.field({ type: "PaymentType", required: true }),
            receivedAt: t.field({ type: "DateTime" }),
            dueAt: t.field({ type: "DateTime" }),
            userId: t.id(),
          }),
        }),
        required: true,
      }),
    },
    validate: {
      schema: CreatePaymentInput,
    },
    resolve: async (query, _parent, args) => {
      return prisma.payment.create({
        ...query,
        data: {
          amount: args.input.amount,
          status: args.input.status || "PENDING",
          type: args.input.type,
          receivedAt: args.input.receivedAt,
          dueAt: args.input.dueAt,
          ...(args.input.userId && { userId: String(args.input.userId) }),
        },
      });
    },
  }),
);

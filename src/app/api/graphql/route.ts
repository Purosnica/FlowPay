import { schema } from "@/lib/graphql/schema";
import { createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";

const { handleRequest } = createYoga<{
  req: NextRequest;
}>({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: {
    Request: Request,
    Response: Response,
  },
});

export { handleRequest as GET, handleRequest as POST };

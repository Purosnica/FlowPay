import { apiClient } from "@/lib/axios";

// Cliente GraphQL usando axios
export async function graphqlRequest<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const response = await apiClient.post<{
      data?: T;
      errors?: Array<{ message: string }>;
    }>("/graphql", {
      query,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0]?.message || "GraphQL error");
    }

    return response.data.data as T;
  } catch (error: any) {
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors[0]?.message || "GraphQL error");
    }
    throw error;
  }
}

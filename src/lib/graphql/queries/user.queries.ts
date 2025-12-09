// GraphQL queries para usuarios
export const GET_USER = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      name
      image
      emailVerified
      createdAt
      updatedAt
    }
  }
`;

export const GET_USERS = `
  query GetUsers {
    users {
      id
      email
      name
      image
      createdAt
    }
  }
`;

export const CREATE_USER = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      name
      image
    }
  }
`;

export const UPDATE_USER = `
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      name
      image
    }
  }
`;

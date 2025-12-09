// GraphQL queries para pagos
export const GET_PAYMENTS = `
  query GetPayments($userId: ID, $status: PaymentStatus, $type: PaymentType) {
    payments(userId: $userId, status: $status, type: $type) {
      id
      amount
      status
      type
      receivedAt
      dueAt
      createdAt
      updatedAt
      user {
        id
        name
        email
      }
    }
  }
`;

export const GET_PAYMENT = `
  query GetPayment($id: ID!) {
    payment(id: $id) {
      id
      amount
      status
      type
      receivedAt
      dueAt
      createdAt
      updatedAt
      user {
        id
        name
        email
      }
    }
  }
`;

export const CREATE_PAYMENT = `
  mutation CreatePayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      id
      amount
      status
      type
      receivedAt
      dueAt
      createdAt
    }
  }
`;

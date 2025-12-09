// GraphQL queries para canales
export const GET_CHANNELS = `
  query GetChannels($userId: ID) {
    channels(userId: $userId) {
      id
      name
      visits
      revenue
      conversion
      createdAt
      updatedAt
    }
  }
`;

export const GET_CHANNEL = `
  query GetChannel($id: ID!) {
    channel(id: $id) {
      id
      name
      visits
      revenue
      conversion
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_CHANNEL = `
  mutation CreateChannel($input: CreateChannelInput!) {
    createChannel(input: $input) {
      id
      name
      visits
      revenue
      conversion
    }
  }
`;

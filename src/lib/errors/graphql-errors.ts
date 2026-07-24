/**
 * Errores de dominio GraphQL.
 * Extienden GraphQLError para que Yoga (maskedErrors) no los
 * reescriba como "Unexpected error." en producción.
 */

import { GraphQLError } from 'graphql';

import { ErrorCode } from './types';

export class GraphQLPermissionError extends GraphQLError {
  constructor(message: string, code: ErrorCode = ErrorCode.FORBIDDEN) {
    super(message, {
      extensions: {
        code,
        statusCode: 403,
        userMessage: message,
        timestamp: new Date().toISOString(),
      },
    });
    this.name = 'GraphQLPermissionError';
  }
}

export class GraphQLAuthenticationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: ErrorCode.UNAUTHORIZED,
        statusCode: 401,
        userMessage: message,
        timestamp: new Date().toISOString(),
      },
    });
    this.name = 'GraphQLAuthenticationError';
  }
}

export class GraphQLValidationError extends GraphQLError {
  constructor(message: string, code: ErrorCode = ErrorCode.VALIDATION_ERROR) {
    super(message, {
      extensions: {
        code,
        statusCode: 400,
        userMessage: message,
        timestamp: new Date().toISOString(),
      },
    });
    this.name = 'GraphQLValidationError';
  }
}

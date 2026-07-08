/**
 * ERRORES PERSONALIZADOS PARA GRAPHQL
 * 
 * Clases de error personalizadas que se formatean correctamente
 * para GraphQL con extensiones apropiadas.
 */

import { ErrorCode } from "./types";

export class GraphQLPermissionError extends Error {
  public extensions: {
    code: ErrorCode;
    statusCode: number;
    userMessage: string;
    timestamp: string;
  };

  constructor(message: string, code: ErrorCode = ErrorCode.FORBIDDEN) {
    super(message);
    this.name = "GraphQLPermissionError";
    this.extensions = {
      code,
      statusCode: 403,
      userMessage: message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class GraphQLAuthenticationError extends Error {
  public extensions: {
    code: ErrorCode;
    statusCode: number;
    userMessage: string;
    timestamp: string;
  };

  constructor(message: string) {
    super(message);
    this.name = "GraphQLAuthenticationError";
    this.extensions = {
      code: ErrorCode.UNAUTHORIZED,
      statusCode: 401,
      userMessage: message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class GraphQLValidationError extends Error {
  public extensions: {
    code: ErrorCode;
    statusCode: number;
    userMessage: string;
    timestamp: string;
  };

  constructor(message: string, code: ErrorCode = ErrorCode.VALIDATION_ERROR) {
    super(message);
    this.name = "GraphQLValidationError";
    this.extensions = {
      code,
      statusCode: 400,
      userMessage: message,
      timestamp: new Date().toISOString(),
    };
  }
}


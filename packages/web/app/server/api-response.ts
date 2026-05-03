/**
 * Standardized error response format for all API endpoints
 */

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string | string[];
  };
  timestamp: string;
  requestId?: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Error codes
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_API_KEY: "INVALID_API_KEY",
  EXPIRED_API_KEY: "EXPIRED_API_KEY",
  
  // Authorization errors (403)
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  API_KEY_NOT_AUTHORIZED: "API_KEY_NOT_AUTHORIZED",
  
  // Validation errors (400)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_JSON: "INVALID_JSON",
  MISSING_FIELD: "MISSING_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  
  // Not found errors (404)
  NOT_FOUND: "NOT_FOUND",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  RUN_NOT_FOUND: "RUN_NOT_FOUND",
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  
  // File upload errors (413)
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  
  // Server errors (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// HTTP status codes mapping
export const StatusCodes: Record<ErrorCode, number> = {
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.INVALID_API_KEY]: 401,
  [ErrorCodes.EXPIRED_API_KEY]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCodes.API_KEY_NOT_AUTHORIZED]: 403,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_JSON]: 400,
  [ErrorCodes.MISSING_FIELD]: 400,
  [ErrorCodes.INVALID_FORMAT]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.PROJECT_NOT_FOUND]: 404,
  [ErrorCodes.ORGANIZATION_NOT_FOUND]: 404,
  [ErrorCodes.RUN_NOT_FOUND]: 404,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.FILE_TOO_LARGE]: 413,
  [ErrorCodes.INVALID_FILE_TYPE]: 415,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
};

// Helper function to create error responses
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: string | string[]
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };
}

// Helper function to create success responses
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

// Helper to send JSON error response
export function sendError(
  code: ErrorCode,
  message: string,
  details?: string | string[]
): Response {
  const status = StatusCodes[code] || 500;
  const body = createErrorResponse(code, message, details);
  
  return Response.json(body, { 
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// Helper to send JSON success response
export function sendSuccess<T>(data: T, status = 200): Response {
  const body = createSuccessResponse(data);
  
  return Response.json(body, { 
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

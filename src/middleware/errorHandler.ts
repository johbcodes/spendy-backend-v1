import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

function formatPrismaError(err: any): { statusCode: number; message: string } {
  const code: string = err.code ?? '';
  const meta = err.meta ?? {};

  switch (code) {
    case 'P2002': {
      const fields = Array.isArray(meta.target) ? meta.target.join(', ') : meta.target ?? 'field';
      return { statusCode: 409, message: `${fields} already exists` };
    }
    case 'P2025':
      return { statusCode: 404, message: meta.cause ?? 'Record not found' };
    case 'P2003': {
      const field = meta.field_name ?? 'related record';
      return { statusCode: 400, message: `Invalid reference: ${field} does not exist` };
    }
    case 'P2004':
      return { statusCode: 400, message: 'Database constraint violated' };
    case 'P2011':
      return { statusCode: 400, message: `Required field is null: ${meta.constraint ?? ''}` };
    case 'P2012':
      return { statusCode: 400, message: `Missing required field: ${meta.path ?? ''}` };
    case 'P2014':
      return { statusCode: 400, message: 'Relation constraint violated' };
    case 'P2016':
      return { statusCode: 400, message: 'Query interpretation error' };
    case 'P2021':
      return { statusCode: 500, message: `Table not found: ${meta.table ?? ''}` };
    case 'P2022':
      return { statusCode: 500, message: `Column not found: ${meta.column ?? ''}` };
    default:
      return { statusCode: 400, message: `Database error (${code})` };
  }
}

function formatZodError(err: ZodError): { statusCode: number; message: string; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  err.issues.forEach((e) => {
    const path = e.path.map(String).join('.') || 'value';
    errors[path] = e.message;
  });
  return {
    statusCode: 422,
    message: 'Validation failed',
    errors,
  };
}

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: Record<string, string> | undefined;
  let stack: string | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
  } else if (err instanceof ZodError) {
    const formatted = formatZodError(err);
    statusCode = formatted.statusCode;
    message = formatted.message;
    errors = formatted.errors;
  } else if (err instanceof Error) {
    const name = err.constructor.name;
    stack = err.stack;

    if (name === 'PrismaClientKnownRequestError') {
      const formatted = formatPrismaError(err as any);
      statusCode = formatted.statusCode;
      message = formatted.message;
    } else if (name === 'PrismaClientValidationError') {
      statusCode = 400;
      message = 'Invalid database query';
    } else if (name === 'PrismaClientInitializationError') {
      statusCode = 503;
      message = 'Database unavailable';
    } else if (name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    } else if (name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    } else {
      message = err.message || 'Internal server error';
    }
  }

  const isDev = process.env.NODE_ENV === 'development';

  if (statusCode >= 500) {
    logger.error('Server error', {
      statusCode,
      message: err instanceof Error ? err.message : String(err),
      path: req.path,
      method: req.method,
      requestId: req.id,
      stack: isDev ? stack : undefined,
    });
  } else {
    logger.warn('Client error', {
      statusCode,
      message,
      path: req.path,
      method: req.method,
      requestId: req.id,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(isDev && stack && { stack }),
  });
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

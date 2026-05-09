import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

/**
 * Multi-tenancy middleware
 * Ensures all database queries are scoped to the user's company
 * This prevents data leakage between companies
 */
export const enforceTenancy = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.companyId) {
    throw new ApiError(401, 'Company context not found');
  }

  // CompanyId is already set in auth middleware
  // This middleware validates it exists and can add additional checks

  next();
};

/**
 * Validates that a resource belongs to the user's company
 * Usage: validateResourceOwnership('walletId', prisma.wallet)
 */
export const createResourceOwnershipValidator = <T extends { companyId: string }>(
  resourceIdParam: string,
  repository: {
    findUnique: (args: any) => Promise<T | null>;
  }
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userCompanyId = req.companyId;

      if (!userCompanyId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const resource = await repository.findUnique({
        where: { id: resourceId },
        select: { companyId: true },
      });

      if (!resource) {
        throw new ApiError(404, 'Resource not found');
      }

      if (resource.companyId !== userCompanyId) {
        throw new ApiError(403, 'Access denied: Resource belongs to another company');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

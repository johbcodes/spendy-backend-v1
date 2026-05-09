import { JwtPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: JwtPayload;
      companyId?: string;
    }
  }
}

export {};

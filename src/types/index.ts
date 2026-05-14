import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  userId?: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: any;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  sort?: string;
  order?: string;
  startDate?: string;
  endDate?: string;
}

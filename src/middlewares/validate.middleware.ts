import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '@/utils/response';

export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    const formatted = errors.array().map((e: any) => ({
      field: e.path,
      message: e.msg,
    }));

    return sendError(res, 400, 'Validation failed', formatted);
  };
};

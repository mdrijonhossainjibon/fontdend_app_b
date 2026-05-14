import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { Solution } from '@/models/Solution';

function extractClassNames(solution: any, type: string): string[] {
  switch (type) {
    case 'objectTag': return Array.isArray(solution) ? solution : [];
    case 'objectClassify': return solution ? ['selected'] : [];
    default: return [];
  }
}

function generateDefaultSolution(type: string): any {
  switch (type) {
    case 'objectClassify': return [true, false, true, false, true];
    case 'objectClick': return [{ x: 100, y: 100 }];
    case 'objectDrag': return [{ start: 'A', end: 'B' }];
    case 'objectTag': return ['example', 'tag'];
    case 'grid': return [0, 1, 2];
    default: return null;
  }
}

export const solveCaptcha = asyncHandler(async (req: Request, res: Response) => {
  const { hash, question, type, service = 'awswaf', imageData, examples } = req.body;

  if (!hash || !type) throw new ApiError(400, 'hash and type are required');

  const existing = await Solution.findOne({ hash });
  if (existing) {
    return sendSuccess(res, { solution: existing.solution, classNames: existing.classNames, cached: true });
  }

  const solution = generateDefaultSolution(type);
  const classNames = extractClassNames(solution, type);

  await Solution.create({
    hash, question: question || '', type, service,
    solution, imageData: imageData || [], examples: examples || [],
    classNames, userId: (req as any).user._id, apiKeyId: null,
  });

  sendSuccess(res, { solution, classNames, cached: false });
});

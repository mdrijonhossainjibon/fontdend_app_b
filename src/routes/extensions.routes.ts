import { Router } from 'express';
import * as extensionsController from '@/controllers/extensions.controller';

const router = Router();

router.get('/', extensionsController.list);

export default router;

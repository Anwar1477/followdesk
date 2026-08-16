import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { searchQuerySchema } from '../validators/search.validator';

const router = Router();

router.use(authenticate);
router.get('/', validate({ query: searchQuerySchema }), searchController.search);

export default router;

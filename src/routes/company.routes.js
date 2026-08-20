import { Router } from 'express';
import * as companyController from '../controllers/company.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createCompanySchema,
  updateCompanySchema,
  listCompaniesQuerySchema,
} from '../schemas/company.schema.js';

const router = Router();

router.post('/', validate(createCompanySchema), companyController.createCompany);
router.get('/', validate(listCompaniesQuerySchema), companyController.getCompanies);
router.get('/:id', companyController.getCompanyById);
router.patch('/:id', validate(updateCompanySchema), companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

export default router;
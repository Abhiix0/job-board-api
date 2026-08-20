import * as companyService from '../services/company.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createCompany = asyncHandler(async (req, res) => {
  const company = await companyService.createCompany(req.body);
  res.status(201).json({ success: true, data: company });
});

export const getCompanies = asyncHandler(async (req, res) => {
  const result = await companyService.getCompanies(req.query);
  res.status(200).json({ success: true, ...result });
});

export const getCompanyById = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(req.params.id);
  res.status(200).json({ success: true, data: company });
});

export const updateCompany = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompany(req.params.id, req.body);
  res.status(200).json({ success: true, data: company });
});

export const deleteCompany = asyncHandler(async (req, res) => {
  await companyService.deleteCompany(req.params.id);
  res.status(204).send();
});
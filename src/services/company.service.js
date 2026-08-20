import { Company } from '../models/company.model.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';

export async function createCompany(data) {
  return Company.create(data);
}

export async function getCompanies({ page, limit, search }) {
  const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

  const [data, total] = await Promise.all([
    Company.find(filter).skip((page - 1) * limit).limit(limit),
    Company.countDocuments(filter),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCompanyById(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid company id format');
  }
  const company = await Company.findById(id);
  if (!company) {
    throw new ApiError(404, 'COMPANY_NOT_FOUND', 'Company does not exist');
  }
  return company;
}

export async function updateCompany(id, data) {
  const company = await getCompanyById(id); // reuses the validation + 404 check
  Object.assign(company, data);
  await company.save();
  return company;
}

export async function deleteCompany(id) {
  const company = await getCompanyById(id);
  // TODO: once Job model exists, check for dependent Jobs here and throw 409
  await company.deleteOne();
}
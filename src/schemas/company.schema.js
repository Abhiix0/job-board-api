import { z } from 'zod';

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    website: z.string().url('Invalid URL').optional(),
    location: z.string().optional(),
  }),
});

export const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    website: z.string().url().optional(),
    location: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

export const listCompaniesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
  }),
});
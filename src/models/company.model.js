import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    website: { type: String, trim: true },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Company = mongoose.model('Company', companySchema);
import { describe, it, expect } from '@jest/globals';
import {
  certificationSchema,
  certificationInsertSchema,
  certificationUpdateSchema,
  certificationPartialSchema,
} from './certification';

describe('certificationSchema', () => {
  const validCertification = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    code: 'ACCA',
    name: 'Association of Chartered Certified Accountants',
    description: 'Professional accounting certification',
    total_papers: 13,
    organization: 'ACCA Global',
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should validate a valid certification object', () => {
    const result = certificationSchema.safeParse(validCertification);
    expect(result.success).toBe(true);
  });

  it('should reject empty code', () => {
    const invalidCertification = { ...validCertification, code: '' };
    const result = certificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const invalidCertification = { ...validCertification, name: '' };
    const result = certificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it('should accept null for optional fields', () => {
    const certificationWithNulls = {
      ...validCertification,
      description: null,
      total_papers: null,
      organization: null,
    };
    const result = certificationSchema.safeParse(certificationWithNulls);
    expect(result.success).toBe(true);
  });

  it('should reject negative total_papers', () => {
    const invalidCertification = { ...validCertification, total_papers: -1 };
    const result = certificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it('should reject zero total_papers', () => {
    const invalidCertification = { ...validCertification, total_papers: 0 };
    const result = certificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it('should reject non-integer total_papers', () => {
    const invalidCertification = { ...validCertification, total_papers: 13.5 };
    const result = certificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });
});

describe('certificationInsertSchema', () => {
  const validInsert = {
    code: 'ACCA',
    name: 'Association of Chartered Certified Accountants',
    description: 'Professional accounting certification',
    total_papers: 13,
    organization: 'ACCA Global',
    metadata: {},
  };

  it('should validate a valid insert object', () => {
    const result = certificationInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it('should reject object with id field', () => {
    const withId = { ...validInsert, id: '123e4567-e89b-12d3-a456-426614174000' };
    const result = certificationInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe('certificationUpdateSchema', () => {
  it('should allow partial updates', () => {
    const partialUpdate = { name: 'Updated Name' };
    const result = certificationUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = certificationUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate fields that are provided', () => {
    const invalidUpdate = { total_papers: -1 };
    const result = certificationUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe('certificationPartialSchema', () => {
  it('should allow partial certification object', () => {
    const partial = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      code: 'ACCA',
    };
    const result = certificationPartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = certificationPartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

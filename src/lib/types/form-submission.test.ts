import { describe, it, expect } from '@jest/globals';
import {
  formSubmissionSchema,
  formSubmissionInsertSchema,
  formSubmissionUpdateSchema,
  formSubmissionPartialSchema,
} from './form-submission';

describe('formSubmissionSchema', () => {
  const validFormSubmission = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    student_id: '123e4567-e89b-12d3-a456-426614174001',
    form_name: 'Student Registration Form',
    submission_id: 'FORM-2024-001',
    submitted_at: '2024-01-01T10:00:00Z',
    raw_data: { name: 'John Doe', email: 'john@example.com' },
    processed: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should validate a valid form submission object', () => {
    const result = formSubmissionSchema.safeParse(validFormSubmission);
    expect(result.success).toBe(true);
  });

  it('should reject empty form_name', () => {
    const invalidFormSubmission = { ...validFormSubmission, form_name: '' };
    const result = formSubmissionSchema.safeParse(invalidFormSubmission);
    expect(result.success).toBe(false);
  });

  it('should accept null for optional fields', () => {
    const formSubmissionWithNulls = {
      ...validFormSubmission,
      student_id: null,
      submission_id: null,
      submitted_at: null,
    };
    const result = formSubmissionSchema.safeParse(formSubmissionWithNulls);
    expect(result.success).toBe(true);
  });

  it('should use default value for processed', () => {
    const formSubmissionWithoutProcessed = { ...validFormSubmission };
    delete (formSubmissionWithoutProcessed as Partial<typeof validFormSubmission>).processed;
    const result = formSubmissionSchema.safeParse(formSubmissionWithoutProcessed);
    expect(result.success).toBe(true);
  });

  it('should accept processed as true', () => {
    const processedFormSubmission = { ...validFormSubmission, processed: true };
    const result = formSubmissionSchema.safeParse(processedFormSubmission);
    expect(result.success).toBe(true);
  });

  it('should accept empty raw_data object', () => {
    const formSubmissionEmptyData = { ...validFormSubmission, raw_data: {} };
    const result = formSubmissionSchema.safeParse(formSubmissionEmptyData);
    expect(result.success).toBe(true);
  });

  it('should accept complex raw_data object', () => {
    const formSubmissionComplexData = {
      ...validFormSubmission,
      raw_data: {
        name: 'John Doe',
        email: 'john@example.com',
        address: {
          street: '123 Main St',
          city: 'Mumbai',
        },
        certifications: ['ACCA', 'CMA'],
      },
    };
    const result = formSubmissionSchema.safeParse(formSubmissionComplexData);
    expect(result.success).toBe(true);
  });
});

describe('formSubmissionInsertSchema', () => {
  const validInsert = {
    student_id: '123e4567-e89b-12d3-a456-426614174001',
    form_name: 'Student Registration Form',
    submission_id: 'FORM-2024-001',
    submitted_at: '2024-01-01T10:00:00Z',
    raw_data: { name: 'John Doe', email: 'john@example.com' },
    processed: false,
  };

  it('should validate a valid insert object', () => {
    const result = formSubmissionInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it('should reject object with id field', () => {
    const withId = { ...validInsert, id: '123e4567-e89b-12d3-a456-426614174000' };
    const result = formSubmissionInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe('formSubmissionUpdateSchema', () => {
  it('should allow partial updates', () => {
    const partialUpdate = { processed: true };
    const result = formSubmissionUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = formSubmissionUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate fields that are provided', () => {
    const invalidUpdate = { form_name: '' };
    const result = formSubmissionUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe('formSubmissionPartialSchema', () => {
  it('should allow partial form submission object', () => {
    const partial = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      form_name: 'Student Registration Form',
    };
    const result = formSubmissionPartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = formSubmissionPartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

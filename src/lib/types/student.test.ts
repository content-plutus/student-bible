import { describe, it, expect } from '@jest/globals';
import {
  studentSchema,
  studentInsertSchema,
  studentUpdateSchema,
  studentPartialSchema,
} from './student';

describe('studentSchema', () => {
  const validStudent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    phone_number: '9876543210',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    gender: 'Male',
    date_of_birth: '2000-01-01',
    guardian_phone: '9876543211',
    salutation: 'Mr.',
    father_name: 'John Sr.',
    mother_name: 'Jane Doe',
    aadhar_number: '123456789012',
    pan_number: 'ABCDE1234F',
    enrollment_status: 'active',
    extra_fields: {},
  };

  it('should validate a valid student object', () => {
    const result = studentSchema.safeParse(validStudent);
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone number format', () => {
    const invalidStudent = { ...validStudent, phone_number: '1234567890' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should reject phone number starting with invalid digit', () => {
    const invalidStudent = { ...validStudent, phone_number: '5876543210' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const invalidStudent = { ...validStudent, email: 'invalid-email' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should accept null for optional fields', () => {
    const studentWithNulls = {
      ...validStudent,
      last_name: null,
      gender: null,
      date_of_birth: null,
      guardian_phone: null,
      salutation: null,
      father_name: null,
      mother_name: null,
      aadhar_number: null,
      pan_number: null,
      enrollment_status: null,
    };
    const result = studentSchema.safeParse(studentWithNulls);
    expect(result.success).toBe(true);
  });

  it('should reject invalid AADHAR format', () => {
    const invalidStudent = { ...validStudent, aadhar_number: '12345' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should reject AADHAR with non-numeric characters', () => {
    const invalidStudent = { ...validStudent, aadhar_number: '12345678901A' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should reject invalid PAN format', () => {
    const invalidStudent = { ...validStudent, pan_number: 'INVALID123' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should reject PAN with lowercase letters', () => {
    const invalidStudent = { ...validStudent, pan_number: 'abcde1234f' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should reject when guardian phone is same as student phone', () => {
    const invalidStudent = { ...validStudent, guardian_phone: '9876543210' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should accept when guardian phone is different from student phone', () => {
    const validStudentWithGuardian = { ...validStudent, guardian_phone: '9876543211' };
    const result = studentSchema.safeParse(validStudentWithGuardian);
    expect(result.success).toBe(true);
  });

  it('should reject invalid guardian phone format', () => {
    const invalidStudent = { ...validStudent, guardian_phone: '1234567890' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should trim whitespace from first_name', () => {
    const studentWithSpaces = { ...validStudent, first_name: '  John  ' };
    const result = studentSchema.safeParse(studentWithSpaces);
    expect(result.success).toBe(true);
  });

  it('should reject empty first_name', () => {
    const invalidStudent = { ...validStudent, first_name: '' };
    const result = studentSchema.safeParse(invalidStudent);
    expect(result.success).toBe(false);
  });

  it('should convert email to lowercase', () => {
    const studentWithUpperEmail = { ...validStudent, email: 'TEST@EXAMPLE.COM' };
    const result = studentSchema.safeParse(studentWithUpperEmail);
    expect(result.success).toBe(true);
  });
});

describe('studentInsertSchema', () => {
  const validInsert = {
    phone_number: '9876543210',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    gender: 'Male',
    date_of_birth: '2000-01-01',
    guardian_phone: null,
    salutation: 'Mr.',
    father_name: 'John Sr.',
    mother_name: 'Jane Doe',
    aadhar_number: '123456789012',
    pan_number: 'ABCDE1234F',
    enrollment_status: 'active',
    extra_fields: {},
  };

  it('should validate a valid insert object', () => {
    const result = studentInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it('should reject object with id field', () => {
    const withId = { ...validInsert, id: '123e4567-e89b-12d3-a456-426614174000' };
    const result = studentInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe('studentUpdateSchema', () => {
  it('should allow partial updates', () => {
    const partialUpdate = { first_name: 'Jane' };
    const result = studentUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = studentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate fields that are provided', () => {
    const invalidUpdate = { phone_number: '1234567890' };
    const result = studentUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe('studentPartialSchema', () => {
  it('should allow partial student object', () => {
    const partial = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      first_name: 'John',
    };
    const result = studentPartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = studentPartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

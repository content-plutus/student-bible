import { describe, it, expect } from '@jest/globals';
import {
  testScoreSchema,
  testScoreInsertSchema,
  testScoreUpdateSchema,
  testScorePartialSchema,
} from './test-score';

describe('testScoreSchema', () => {
  const validTestScore = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    student_id: '123e4567-e89b-12d3-a456-426614174001',
    assessment_name: 'Mid-term Exam',
    assessment_type: 'Written',
    assessment_date: '2024-03-15',
    score: 85.5,
    max_score: 100,
    weighted_score: 42.75,
    analysis_data: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should validate a valid test score object', () => {
    const result = testScoreSchema.safeParse(validTestScore);
    expect(result.success).toBe(true);
  });

  it('should reject empty assessment_name', () => {
    const invalidTestScore = { ...validTestScore, assessment_name: '' };
    const result = testScoreSchema.safeParse(invalidTestScore);
    expect(result.success).toBe(false);
  });

  it('should accept null for optional fields', () => {
    const testScoreWithNulls = {
      ...validTestScore,
      assessment_type: null,
      assessment_date: null,
      score: null,
      max_score: null,
      weighted_score: null,
    };
    const result = testScoreSchema.safeParse(testScoreWithNulls);
    expect(result.success).toBe(true);
  });

  it('should reject negative score', () => {
    const invalidTestScore = { ...validTestScore, score: -1 };
    const result = testScoreSchema.safeParse(invalidTestScore);
    expect(result.success).toBe(false);
  });

  it('should reject score greater than 999.99', () => {
    const invalidTestScore = { ...validTestScore, score: 1000 };
    const result = testScoreSchema.safeParse(invalidTestScore);
    expect(result.success).toBe(false);
  });

  it('should accept score of 0', () => {
    const validTestScoreZero = { ...validTestScore, score: 0 };
    const result = testScoreSchema.safeParse(validTestScoreZero);
    expect(result.success).toBe(true);
  });

  it('should accept score of 999.99', () => {
    const validTestScoreMax = { ...validTestScore, score: 999.99 };
    const result = testScoreSchema.safeParse(validTestScoreMax);
    expect(result.success).toBe(true);
  });

  it('should reject negative max_score', () => {
    const invalidTestScore = { ...validTestScore, max_score: -1 };
    const result = testScoreSchema.safeParse(invalidTestScore);
    expect(result.success).toBe(false);
  });

  it('should reject max_score greater than 999.99', () => {
    const invalidTestScore = { ...validTestScore, max_score: 1000 };
    const result = testScoreSchema.safeParse(invalidTestScore);
    expect(result.success).toBe(false);
  });

  it('should reject negative weighted_score', () => {
    const invalidTestScore = { ...validTestScore, weighted_score: -1 };
    const result = testScoreSchema.safeParse(invalidTestScore);
    expect(result.success).toBe(false);
  });

  it('should reject weighted_score greater than 999.99', () => {
    const invalidTestScore = { ...validTestScore, weighted_score: 1000 };
    const result = testScoreSchema.safeParse(invalidTestScore);
    expect(result.success).toBe(false);
  });

  it('should accept decimal scores', () => {
    const validTestScoreDecimal = {
      ...validTestScore,
      score: 85.75,
      max_score: 100.0,
      weighted_score: 42.875,
    };
    const result = testScoreSchema.safeParse(validTestScoreDecimal);
    expect(result.success).toBe(true);
  });
});

describe('testScoreInsertSchema', () => {
  const validInsert = {
    student_id: '123e4567-e89b-12d3-a456-426614174001',
    assessment_name: 'Mid-term Exam',
    assessment_type: 'Written',
    assessment_date: '2024-03-15',
    score: 85.5,
    max_score: 100,
    weighted_score: 42.75,
    analysis_data: {},
  };

  it('should validate a valid insert object', () => {
    const result = testScoreInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it('should reject object with id field', () => {
    const withId = { ...validInsert, id: '123e4567-e89b-12d3-a456-426614174000' };
    const result = testScoreInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe('testScoreUpdateSchema', () => {
  it('should allow partial updates', () => {
    const partialUpdate = { score: 90 };
    const result = testScoreUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = testScoreUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate fields that are provided', () => {
    const invalidUpdate = { score: -1 };
    const result = testScoreUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe('testScorePartialSchema', () => {
  it('should allow partial test score object', () => {
    const partial = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      assessment_name: 'Mid-term Exam',
    };
    const result = testScorePartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = testScorePartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

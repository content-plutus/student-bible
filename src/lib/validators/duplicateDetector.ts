import { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateNameSimilarity,
  calculateIndianNameSimilarity,
  comparePhoneNumbers,
  compareEmails,
  compareAadharNumbers,
  calculateDateSimilarity,
  calculateOverallSimilarity,
  normalizePhoneForMatching,
  normalizeEmailForMatching,
  normalizeAadharForMatching,
  SimilarityScore,
} from "../utils/fuzzyMatch";
import {
  MatchingCriteria,
  DEFAULT_MATCHING_CRITERIA,
  FieldMatchingRule,
  getEnabledFieldRules,
  getEnabledCrossFieldRules,
} from "./matchingRules";
import { Student } from "../types/student";

export const CROSS_FIELD_RULE_THRESHOLD = 0.85;

const CANDIDATE_FIELDS =
  "id, first_name, last_name, full_name, phone_number, email, aadhar_number, date_of_birth, guardian_phone, pan_number";

export interface DuplicateMatch {
  student: Student;
  overallScore: number;
  fieldScores: SimilarityScore[];
  matchedCrossFieldRules: string[];
  confidence: "high" | "medium" | "low";
}

export interface DuplicateDetectionResult {
  hasPotentialDuplicates: boolean;
  matches: DuplicateMatch[];
  totalMatches: number;
  criteria: MatchingCriteria;
}

export interface StudentInput {
  phone_number?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string | Date | null;
  aadhar_number?: string | null;
  guardian_phone?: string | null;
  pan_number?: string | null;
  extra_fields?: Record<string, unknown>;
}

export class DuplicateDetector {
  private criteria: MatchingCriteria;

  constructor(criteria: MatchingCriteria = DEFAULT_MATCHING_CRITERIA) {
    this.criteria = criteria;
  }

  public configureMatchingRules(criteria: MatchingCriteria): void {
    this.criteria = criteria;
  }

  public getCriteria(): MatchingCriteria {
    return this.criteria;
  }

  public async findPotentialDuplicates(
    supabase: SupabaseClient,
    studentData: StudentInput,
    options: { excludeStudentId?: string } = {},
  ): Promise<DuplicateDetectionResult> {
    const candidates = await this.fetchCandidates(supabase, studentData, options);

    const matches: DuplicateMatch[] = [];

    for (const candidate of candidates) {
      const match = this.evaluateCandidate(studentData, candidate);

      if (match && match.overallScore >= this.criteria.overallThreshold) {
        matches.push(match);
      }
    }

    matches.sort((a, b) => b.overallScore - a.overallScore);

    const limitedMatches = matches.slice(0, this.criteria.maxResults);

    return {
      hasPotentialDuplicates: limitedMatches.length > 0,
      matches: limitedMatches,
      totalMatches: matches.length,
      criteria: this.criteria,
    };
  }

  private async fetchCandidates(
    supabase: SupabaseClient,
    studentData: StudentInput,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const candidates: Student[] = [];
    const seenIds = new Set<string>();

    if (studentData.phone_number) {
      const phoneMatches = await this.fetchByPhone(supabase, studentData.phone_number, options);
      for (const match of phoneMatches) {
        if (!seenIds.has(match.id)) {
          candidates.push(match);
          seenIds.add(match.id);
        }
      }
    }

    if (studentData.email) {
      const emailMatches = await this.fetchByEmail(supabase, studentData.email, options);
      for (const match of emailMatches) {
        if (!seenIds.has(match.id)) {
          candidates.push(match);
          seenIds.add(match.id);
        }
      }
    }

    if (studentData.aadhar_number) {
      const aadharMatches = await this.fetchByAadhar(supabase, studentData.aadhar_number, options);
      for (const match of aadharMatches) {
        if (!seenIds.has(match.id)) {
          candidates.push(match);
          seenIds.add(match.id);
        }
      }
    }

    if (studentData.first_name || studentData.last_name) {
      const nameMatches = await this.fetchByName(
        supabase,
        studentData.first_name,
        studentData.last_name,
        options,
      );
      for (const match of nameMatches) {
        if (!seenIds.has(match.id)) {
          candidates.push(match);
          seenIds.add(match.id);
        }
      }
    }

    if (studentData.guardian_phone) {
      const guardianPhoneMatches = await this.fetchByGuardianPhone(
        supabase,
        studentData.guardian_phone,
        options,
      );
      for (const match of guardianPhoneMatches) {
        if (!seenIds.has(match.id)) {
          candidates.push(match);
          seenIds.add(match.id);
        }
      }
    }

    if (studentData.pan_number) {
      const panMatches = await this.fetchByPanNumber(supabase, studentData.pan_number, options);
      for (const match of panMatches) {
        if (!seenIds.has(match.id)) {
          candidates.push(match);
          seenIds.add(match.id);
        }
      }
    }

    if (studentData.date_of_birth) {
      const dobMatches = await this.fetchByDateOfBirth(
        supabase,
        studentData.date_of_birth,
        options,
      );
      for (const match of dobMatches) {
        if (!seenIds.has(match.id)) {
          candidates.push(match);
          seenIds.add(match.id);
        }
      }
    }

    return candidates;
  }

  private async fetchByPhone(
    supabase: SupabaseClient,
    phone: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = normalizePhoneForMatching(phone);

    let query = supabase.from("students").select(CANDIDATE_FIELDS).eq("phone_number", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by phone:", error);
      throw new Error(`Database error fetching by phone: ${error.message}`);
    }

    return (data as Student[]) || [];
  }

  private async fetchByEmail(
    supabase: SupabaseClient,
    email: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = normalizeEmailForMatching(email);

    let query = supabase.from("students").select(CANDIDATE_FIELDS).eq("email", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by email:", error);
      throw new Error(`Database error fetching by email: ${error.message}`);
    }

    return (data as Student[]) || [];
  }

  private async fetchByAadhar(
    supabase: SupabaseClient,
    aadhar: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = normalizeAadharForMatching(aadhar);

    let query = supabase.from("students").select(CANDIDATE_FIELDS).eq("aadhar_number", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by aadhar:", error);
      throw new Error(`Database error fetching by aadhar: ${error.message}`);
    }

    return (data as Student[]) || [];
  }

  private async fetchByName(
    supabase: SupabaseClient,
    firstName?: string,
    lastName?: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    if (!firstName && !lastName) {
      return [];
    }

    const searchTerm = this.constructFullName(firstName, lastName).toLowerCase().trim();
    if (!searchTerm) {
      return [];
    }

    let query = supabase
      .from("students")
      .select(CANDIDATE_FIELDS)
      .ilike("full_name", `%${searchTerm}%`);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by name:", error);
      throw new Error(`Database error fetching by name: ${error.message}`);
    }

    return (data as Student[]) || [];
  }

  private async fetchByGuardianPhone(
    supabase: SupabaseClient,
    guardianPhone: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = normalizePhoneForMatching(guardianPhone);

    let query = supabase.from("students").select(CANDIDATE_FIELDS).eq("guardian_phone", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by guardian phone:", error);
      throw new Error(`Database error fetching by guardian phone: ${error.message}`);
    }

    return (data as Student[]) || [];
  }

  private async fetchByPanNumber(
    supabase: SupabaseClient,
    panNumber: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = panNumber.toUpperCase().trim();

    let query = supabase.from("students").select(CANDIDATE_FIELDS).eq("pan_number", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by PAN number:", error);
      throw new Error(`Database error fetching by PAN number: ${error.message}`);
    }

    return (data as Student[]) || [];
  }

  private async fetchByDateOfBirth(
    supabase: SupabaseClient,
    dateOfBirth: string | Date,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = this.normalizeDateForMatching(dateOfBirth);

    let query = supabase.from("students").select(CANDIDATE_FIELDS).eq("date_of_birth", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by date of birth:", error);
      throw new Error(`Database error fetching by date of birth: ${error.message}`);
    }

    return (data as Student[]) || [];
  }

  private normalizeDateForMatching(date: string | Date): string {
    const parsed = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date_of_birth: cannot parse date");
    }
    return parsed.toISOString().slice(0, 10);
  }

  private evaluateCandidate(studentData: StudentInput, candidate: Student): DuplicateMatch | null {
    const fieldScores: SimilarityScore[] = [];
    const enabledFieldRules = getEnabledFieldRules(this.criteria);

    for (const rule of enabledFieldRules) {
      const score = this.calculateFieldScore(studentData, candidate, rule);
      if (score !== null) {
        fieldScores.push(score);
      }
    }

    if (fieldScores.length === 0) {
      return null;
    }

    const weights: Record<string, number> = {};
    for (const rule of enabledFieldRules) {
      weights[rule.field] = rule.weight;
    }

    const overallScore = calculateOverallSimilarity(fieldScores, weights);

    const matchedCrossFieldRules = this.evaluateCrossFieldRules(
      studentData,
      candidate,
      fieldScores,
    );

    let crossFieldBonus = 0;
    const enabledCrossFieldRules = getEnabledCrossFieldRules(this.criteria);
    for (const ruleName of matchedCrossFieldRules) {
      const rule = enabledCrossFieldRules.find((r) => r.name === ruleName);
      if (rule) {
        crossFieldBonus += rule.weight * 0.1;
      }
    }

    const finalScore = Math.min(1, overallScore + crossFieldBonus);

    const confidence = this.determineConfidence(finalScore, matchedCrossFieldRules.length);

    return {
      student: candidate,
      overallScore: finalScore,
      fieldScores,
      matchedCrossFieldRules,
      confidence,
    };
  }

  private calculateFieldScore(
    studentData: StudentInput,
    candidate: Student,
    rule: FieldMatchingRule,
  ): SimilarityScore | null {
    const field = rule.field;
    let value1: string | undefined;
    let value2: string | undefined;
    let score = 0;

    switch (field) {
      case "phone_number":
        value1 = studentData.phone_number;
        value2 = candidate.phone_number;
        if (value1 && value2) {
          score = comparePhoneNumbers(value1, value2) ? 1 : 0;
        }
        break;

      case "email":
        value1 = studentData.email;
        value2 = candidate.email;
        if (value1 && value2) {
          score = compareEmails(value1, value2) ? 1 : 0;
        }
        break;

      case "aadhar_number":
        value1 = studentData.aadhar_number || undefined;
        value2 = candidate.aadhar_number || undefined;
        if (value1 && value2) {
          score = compareAadharNumbers(value1, value2) ? 1 : 0;
        }
        break;

      case "first_name":
        value1 = studentData.first_name;
        value2 = candidate.first_name;
        if (value1 && value2) {
          score = calculateNameSimilarity(value1, value2);
        }
        break;

      case "last_name":
        value1 = studentData.last_name;
        value2 = candidate.last_name || undefined;
        if (value1 && value2) {
          score = calculateNameSimilarity(value1, value2);
        }
        break;

      case "full_name":
        const fullName1 = this.constructFullName(studentData.first_name, studentData.last_name);
        const fullName2 = this.constructFullName(candidate.first_name, candidate.last_name);
        value1 = fullName1;
        value2 = fullName2;
        if (fullName1 && fullName2) {
          score = calculateIndianNameSimilarity(fullName1, fullName2);
        }
        break;

      case "date_of_birth":
        if (studentData.date_of_birth && candidate.date_of_birth) {
          value1 = String(studentData.date_of_birth);
          value2 = String(candidate.date_of_birth);
          score = calculateDateSimilarity(studentData.date_of_birth, candidate.date_of_birth);
        }
        break;

      case "guardian_phone":
        value1 = studentData.guardian_phone || undefined;
        value2 = candidate.guardian_phone || undefined;
        if (value1 && value2) {
          score = comparePhoneNumbers(value1, value2) ? 1 : 0;
        }
        break;

      case "pan_number":
        value1 = studentData.pan_number || undefined;
        value2 = candidate.pan_number || undefined;
        if (value1 && value2) {
          score = value1.toUpperCase() === value2.toUpperCase() ? 1 : 0;
        }
        break;

      default:
        return null;
    }

    if (!value1 || !value2) {
      return null;
    }

    if (score < rule.threshold) {
      return null;
    }

    return {
      score,
      field,
      value1,
      value2,
    };
  }

  private constructFullName(firstName?: string, lastName?: string | null): string {
    const parts = [firstName, lastName].filter((p) => p && p.trim().length > 0);
    return parts.join(" ");
  }

  private evaluateCrossFieldRules(
    studentData: StudentInput,
    candidate: Student,
    fieldScores: SimilarityScore[],
  ): string[] {
    const matchedRules: string[] = [];
    const enabledCrossFieldRules = getEnabledCrossFieldRules(this.criteria);

    for (const rule of enabledCrossFieldRules) {
      let matchCount = 0;

      for (const field of rule.fields) {
        const fieldScore = fieldScores.find((s) => s.field === field);
        if (fieldScore && fieldScore.score >= CROSS_FIELD_RULE_THRESHOLD) {
          matchCount++;
        }
      }

      if (matchCount >= rule.requiredMatches) {
        matchedRules.push(rule.name);
      }
    }

    return matchedRules;
  }

  private determineConfidence(score: number, crossFieldMatches: number): "high" | "medium" | "low" {
    if (score >= 0.9 || crossFieldMatches >= 2) {
      return "high";
    } else if (score >= 0.75 || crossFieldMatches >= 1) {
      return "medium";
    } else {
      return "low";
    }
  }
}

export async function detectDuplicates(
  supabase: SupabaseClient,
  studentData: StudentInput,
  criteria: MatchingCriteria = DEFAULT_MATCHING_CRITERIA,
  options: { excludeStudentId?: string } = {},
): Promise<DuplicateDetectionResult> {
  const detector = new DuplicateDetector(criteria);
  return detector.findPotentialDuplicates(supabase, studentData, options);
}

export function createDuplicateDetector(
  criteria: MatchingCriteria = DEFAULT_MATCHING_CRITERIA,
): DuplicateDetector {
  return new DuplicateDetector(criteria);
}

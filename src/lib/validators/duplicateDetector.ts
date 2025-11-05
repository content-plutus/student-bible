import { SupabaseLike } from "./emailValidator";
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
    supabase: SupabaseLike,
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
    supabase: SupabaseLike,
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

    return candidates;
  }

  private async fetchByPhone(
    supabase: SupabaseLike,
    phone: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = normalizePhoneForMatching(phone);
    
    let query = supabase
      .from("students")
      .select("*")
      .eq("phone_number", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by phone:", error);
      return [];
    }

    return (data as Student[]) || [];
  }

  private async fetchByEmail(
    supabase: SupabaseLike,
    email: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = normalizeEmailForMatching(email);
    
    let query = supabase
      .from("students")
      .select("*")
      .eq("email", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by email:", error);
      return [];
    }

    return (data as Student[]) || [];
  }

  private async fetchByAadhar(
    supabase: SupabaseLike,
    aadhar: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    const normalized = normalizeAadharForMatching(aadhar);
    
    let query = supabase
      .from("students")
      .select("*")
      .eq("aadhar_number", normalized);

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by aadhar:", error);
      return [];
    }

    return (data as Student[]) || [];
  }

  private async fetchByName(
    supabase: SupabaseLike,
    firstName?: string,
    lastName?: string,
    options: { excludeStudentId?: string } = {},
  ): Promise<Student[]> {
    if (!firstName && !lastName) {
      return [];
    }

    let query = supabase.from("students").select("*");

    if (firstName) {
      query = query.ilike("first_name", `%${firstName}%`);
    }

    if (lastName) {
      query = query.ilike("last_name", `%${lastName}%`);
    }

    if (options.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching by name:", error);
      return [];
    }

    return (data as Student[]) || [];
  }

  private evaluateCandidate(
    studentData: StudentInput,
    candidate: Student,
  ): DuplicateMatch | null {
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
        const fullName1 = this.constructFullName(
          studentData.first_name,
          studentData.last_name,
        );
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
        if (fieldScore && fieldScore.score >= 0.85) {
          matchCount++;
        }
      }

      if (matchCount >= rule.requiredMatches) {
        matchedRules.push(rule.name);
      }
    }

    return matchedRules;
  }

  private determineConfidence(
    score: number,
    crossFieldMatches: number,
  ): "high" | "medium" | "low" {
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
  supabase: SupabaseLike,
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

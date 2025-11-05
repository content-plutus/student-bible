import { createClient } from "@supabase/supabase-js";
import {
  comparePhoneNumbers,
  compareEmails,
  hybridNameSimilarity,
  calculateOverallSimilarity,
  type SimilarityScore,
} from "../utils/fuzzyMatch";

export interface StudentInput {
  phone_number: string;
  email: string;
  first_name: string;
  last_name?: string | null;
  date_of_birth?: string | null;
  aadhar_number?: string | null;
  extra_fields?: Record<string, unknown>;
}

export interface MatchingCriteria {
  fields: string[];
  thresholds: Record<string, number>;
  weights: Record<string, number>;
  crossFieldRules: CrossFieldRule[];
}

export interface CrossFieldRule {
  fields: string[];
  threshold: number;
  description: string;
}

export interface DuplicateMatch {
  student_id: string;
  similarity_score: number;
  matched_fields: string[];
  field_scores: Record<string, number>;
  student_data: {
    phone_number: string;
    email: string;
    first_name: string;
    last_name: string | null;
    date_of_birth: string | null;
    aadhar_number: string | null;
  };
}

export interface DuplicateDetectionResult {
  is_duplicate: boolean;
  confidence: "high" | "medium" | "low";
  matches: DuplicateMatch[];
}

export const DEFAULT_MATCHING_CRITERIA: MatchingCriteria = {
  fields: ["phone_number", "email", "first_name", "last_name", "aadhar_number"],
  thresholds: {
    phone_number: 1.0,
    email: 1.0,
    first_name: 0.85,
    last_name: 0.85,
    full_name: 0.8,
    aadhar_number: 1.0,
    date_of_birth: 1.0,
  },
  weights: {
    phone_number: 1.0,
    email: 1.0,
    first_name: 0.6,
    last_name: 0.4,
    full_name: 1.0,
    aadhar_number: 1.0,
    date_of_birth: 0.8,
  },
  crossFieldRules: [
    {
      fields: ["first_name", "last_name", "date_of_birth"],
      threshold: 0.9,
      description: "Same name and date of birth",
    },
    {
      fields: ["phone_number", "first_name"],
      threshold: 0.85,
      description: "Same phone and similar name",
    },
    {
      fields: ["email", "first_name"],
      threshold: 0.85,
      description: "Same email and similar name",
    },
  ],
};

export class DuplicateDetector {
  private criteria: MatchingCriteria;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    criteria: MatchingCriteria = DEFAULT_MATCHING_CRITERIA,
  ) {
    this.criteria = criteria;
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  configureMatchingRules(criteria: Partial<MatchingCriteria>): void {
    this.criteria = {
      ...this.criteria,
      ...criteria,
      thresholds: { ...this.criteria.thresholds, ...criteria.thresholds },
      weights: { ...this.criteria.weights, ...criteria.weights },
      crossFieldRules: criteria.crossFieldRules || this.criteria.crossFieldRules,
    };
  }

  async findPotentialDuplicates(studentData: StudentInput): Promise<DuplicateMatch[]> {
    const supabase = createClient(this.supabaseUrl, this.supabaseKey);
    const matches: DuplicateMatch[] = [];

    const exactMatches = await this.findExactMatches(supabase, studentData);
    matches.push(...exactMatches);

    const fuzzyMatches = await this.findFuzzyMatches(supabase, studentData);
    matches.push(...fuzzyMatches);

    const deduplicatedMatches = this.deduplicateMatches(matches);

    return deduplicatedMatches.sort((a, b) => b.similarity_score - a.similarity_score);
  }

  private async findExactMatches(
    supabase: ReturnType<typeof createClient>,
    studentData: StudentInput,
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    if (studentData.phone_number) {
      const { data: phoneMatches } = await supabase
        .from("students")
        .select("id, phone_number, email, first_name, last_name, date_of_birth, aadhar_number")
        .eq("phone_number", studentData.phone_number)
        .limit(10);

      if (phoneMatches) {
        for (const match of phoneMatches) {
          matches.push(this.createMatch(match, studentData, ["phone_number"], 1.0));
        }
      }
    }

    if (studentData.email) {
      const { data: emailMatches } = await supabase
        .from("students")
        .select("id, phone_number, email, first_name, last_name, date_of_birth, aadhar_number")
        .eq("email", studentData.email.toLowerCase())
        .limit(10);

      if (emailMatches) {
        for (const match of emailMatches) {
          matches.push(this.createMatch(match, studentData, ["email"], 1.0));
        }
      }
    }

    if (studentData.aadhar_number) {
      const { data: aadharMatches } = await supabase
        .from("students")
        .select("id, phone_number, email, first_name, last_name, date_of_birth, aadhar_number")
        .eq("aadhar_number", studentData.aadhar_number)
        .limit(10);

      if (aadharMatches) {
        for (const match of aadharMatches) {
          matches.push(this.createMatch(match, studentData, ["aadhar_number"], 1.0));
        }
      }
    }

    return matches;
  }

  private async findFuzzyMatches(
    supabase: ReturnType<typeof createClient>,
    studentData: StudentInput,
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    const { data: nameMatches } = await supabase
      .from("students")
      .select("id, phone_number, email, first_name, last_name, date_of_birth, aadhar_number")
      .ilike("first_name", `%${studentData.first_name}%`)
      .limit(50);

    if (nameMatches) {
      for (const candidate of nameMatches) {
        const similarity = this.calculateSimilarity(candidate, studentData);

        if (similarity.overallScore >= 0.7) {
          matches.push({
            student_id: candidate.id,
            similarity_score: similarity.overallScore,
            matched_fields: similarity.matchedFields,
            field_scores: similarity.fieldScores,
            student_data: {
              phone_number: candidate.phone_number,
              email: candidate.email,
              first_name: candidate.first_name,
              last_name: candidate.last_name,
              date_of_birth: candidate.date_of_birth,
              aadhar_number: candidate.aadhar_number,
            },
          });
        }
      }
    }

    return matches;
  }

  private calculateSimilarity(
    candidate: {
      phone_number: string;
      email: string;
      first_name: string;
      last_name: string | null;
      date_of_birth: string | null;
      aadhar_number: string | null;
    },
    studentData: StudentInput,
  ): {
    overallScore: number;
    matchedFields: string[];
    fieldScores: Record<string, number>;
  } {
    const scores: SimilarityScore[] = [];
    const matchedFields: string[] = [];
    const fieldScores: Record<string, number> = {};

    if (studentData.phone_number && candidate.phone_number) {
      const match = comparePhoneNumbers(studentData.phone_number, candidate.phone_number);
      const score = match ? 1.0 : 0.0;
      fieldScores.phone_number = score;

      if (score >= this.criteria.thresholds.phone_number) {
        matchedFields.push("phone_number");
        scores.push({
          field: "phone_number",
          score,
          weight: this.criteria.weights.phone_number,
          weightedScore: score * this.criteria.weights.phone_number,
        });
      }
    }

    if (studentData.email && candidate.email) {
      const match = compareEmails(studentData.email, candidate.email);
      const score = match ? 1.0 : 0.0;
      fieldScores.email = score;

      if (score >= this.criteria.thresholds.email) {
        matchedFields.push("email");
        scores.push({
          field: "email",
          score,
          weight: this.criteria.weights.email,
          weightedScore: score * this.criteria.weights.email,
        });
      }
    }

    const nameScore = hybridNameSimilarity(
      `${studentData.first_name} ${studentData.last_name || ""}`.trim(),
      `${candidate.first_name} ${candidate.last_name || ""}`.trim(),
    );
    fieldScores.full_name = nameScore;

    if (nameScore >= this.criteria.thresholds.full_name) {
      matchedFields.push("full_name");
      scores.push({
        field: "full_name",
        score: nameScore,
        weight: this.criteria.weights.full_name,
        weightedScore: nameScore * this.criteria.weights.full_name,
      });
    }

    if (studentData.aadhar_number && candidate.aadhar_number) {
      const match = studentData.aadhar_number === candidate.aadhar_number;
      const score = match ? 1.0 : 0.0;
      fieldScores.aadhar_number = score;

      if (score >= this.criteria.thresholds.aadhar_number) {
        matchedFields.push("aadhar_number");
        scores.push({
          field: "aadhar_number",
          score,
          weight: this.criteria.weights.aadhar_number,
          weightedScore: score * this.criteria.weights.aadhar_number,
        });
      }
    }

    if (studentData.date_of_birth && candidate.date_of_birth) {
      const match = studentData.date_of_birth === candidate.date_of_birth;
      const score = match ? 1.0 : 0.0;
      fieldScores.date_of_birth = score;

      if (score >= this.criteria.thresholds.date_of_birth) {
        matchedFields.push("date_of_birth");
        scores.push({
          field: "date_of_birth",
          score,
          weight: this.criteria.weights.date_of_birth,
          weightedScore: score * this.criteria.weights.date_of_birth,
        });
      }
    }

    const overallScore = scores.length > 0 ? calculateOverallSimilarity(scores) : 0;

    return {
      overallScore,
      matchedFields,
      fieldScores,
    };
  }

  private createMatch(
    candidate: {
      id: string;
      phone_number: string;
      email: string;
      first_name: string;
      last_name: string | null;
      date_of_birth: string | null;
      aadhar_number: string | null;
    },
    studentData: StudentInput,
    matchedFields: string[],
    baseScore: number,
  ): DuplicateMatch {
    const similarity = this.calculateSimilarity(candidate, studentData);

    return {
      student_id: candidate.id,
      similarity_score: Math.max(baseScore, similarity.overallScore),
      matched_fields: [...new Set([...matchedFields, ...similarity.matchedFields])],
      field_scores: similarity.fieldScores,
      student_data: {
        phone_number: candidate.phone_number,
        email: candidate.email,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        date_of_birth: candidate.date_of_birth,
        aadhar_number: candidate.aadhar_number,
      },
    };
  }

  private deduplicateMatches(matches: DuplicateMatch[]): DuplicateMatch[] {
    const uniqueMatches = new Map<string, DuplicateMatch>();

    for (const match of matches) {
      const existing = uniqueMatches.get(match.student_id);

      if (!existing || match.similarity_score > existing.similarity_score) {
        uniqueMatches.set(match.student_id, match);
      }
    }

    return Array.from(uniqueMatches.values());
  }

  async detectDuplicates(studentData: StudentInput): Promise<DuplicateDetectionResult> {
    const matches = await this.findPotentialDuplicates(studentData);

    if (matches.length === 0) {
      return {
        is_duplicate: false,
        confidence: "low",
        matches: [],
      };
    }

    const highestScore = matches[0].similarity_score;

    let confidence: "high" | "medium" | "low";
    if (highestScore >= 0.95) {
      confidence = "high";
    } else if (highestScore >= 0.8) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    return {
      is_duplicate: highestScore >= 0.7,
      confidence,
      matches,
    };
  }
}

export async function createDuplicateDetector(
  criteria?: Partial<MatchingCriteria>,
): Promise<DuplicateDetector> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials not configured");
  }

  const detector = new DuplicateDetector(supabaseUrl, supabaseKey);

  if (criteria) {
    detector.configureMatchingRules(criteria);
  }

  return detector;
}

import { distance as levenshteinDistance } from "fastest-levenshtein";

export interface SimilarityScore {
  score: number;
  field: string;
  value1: string;
  value2: string;
}

export const NAME_LENGTH_PENALTY_FACTOR = 0.1;

export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - distance / maxLength;
}

export function normalizeNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ");
}

export function calculateNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;

  const normalized1 = normalizeNameForMatching(name1);
  const normalized2 = normalizeNameForMatching(name2);

  if (normalized1 === normalized2) return 1;

  const words1 = normalized1.split(" ").filter((w) => w.length > 0);
  const words2 = normalized2.split(" ").filter((w) => w.length > 0);

  if (words1.length === 0 || words2.length === 0) return 0;

  let totalSimilarity = 0;
  let matchCount = 0;

  for (const word1 of words1) {
    let maxSimilarity = 0;
    for (const word2 of words2) {
      const similarity = calculateStringSimilarity(word1, word2);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    totalSimilarity += maxSimilarity;
    matchCount++;
  }

  const avgSimilarity = totalSimilarity / matchCount;

  const lengthPenalty = Math.abs(words1.length - words2.length) * NAME_LENGTH_PENALTY_FACTOR;

  return Math.max(0, avgSimilarity - lengthPenalty);
}

export function normalizePhoneForMatching(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function comparePhoneNumbers(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return false;

  const normalized1 = normalizePhoneForMatching(phone1);
  const normalized2 = normalizePhoneForMatching(phone2);

  return normalized1 === normalized2;
}

export function normalizeEmailForMatching(email: string): string {
  return email.toLowerCase().trim();
}

export function compareEmails(email1: string, email2: string): boolean {
  if (!email1 || !email2) return false;

  const normalized1 = normalizeEmailForMatching(email1);
  const normalized2 = normalizeEmailForMatching(email2);

  return normalized1 === normalized2;
}

export function normalizeAadharForMatching(aadhar: string): string {
  return aadhar.replace(/\D/g, "");
}

export function compareAadharNumbers(aadhar1: string, aadhar2: string): boolean {
  if (!aadhar1 || !aadhar2) return false;

  const normalized1 = normalizeAadharForMatching(aadhar1);
  const normalized2 = normalizeAadharForMatching(aadhar2);

  return normalized1 === normalized2;
}

export function calculateDateSimilarity(date1: string | Date, date2: string | Date): number {
  if (!date1 || !date2) return 0;

  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;

  if (d1.getTime() === d2.getTime()) return 1;

  const daysDiff = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff === 0) return 1;
  if (daysDiff <= 1) return 0.9;
  if (daysDiff <= 7) return 0.7;
  if (daysDiff <= 30) return 0.5;
  if (daysDiff <= 365) return 0.3;

  return 0;
}

export function calculateAddressSimilarity(address1: string, address2: string): number {
  if (!address1 || !address2) return 0;

  const normalized1 = address1
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
  const normalized2 = address2
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

  if (normalized1 === normalized2) return 1;

  const words1 = normalized1.split(" ").filter((w) => w.length > 1);
  const words2 = normalized2.split(" ").filter((w) => w.length > 1);

  if (words1.length === 0 || words2.length === 0) return 0;

  const commonWords = words1.filter((word) => words2.includes(word));
  const commonWordsRatio = (commonWords.length * 2) / (words1.length + words2.length);

  const stringSimilarity = calculateStringSimilarity(normalized1, normalized2);

  return commonWordsRatio * 0.6 + stringSimilarity * 0.4;
}

export function calculateOverallSimilarity(
  similarities: SimilarityScore[],
  weights: Record<string, number> = {},
): number {
  if (similarities.length === 0) return 0;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const similarity of similarities) {
    const weight = weights[similarity.field] ?? 1;
    totalWeightedScore += similarity.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

export function extractIndianNameComponents(fullName: string): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const normalized = normalizeNameForMatching(fullName);
  const parts = normalized.split(" ").filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { firstName: "", middleName: "", lastName: "" };
  } else if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: "" };
  } else if (parts.length === 2) {
    return { firstName: parts[0], middleName: "", lastName: parts[1] };
  } else {
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }
}

export function calculateIndianNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;

  const components1 = extractIndianNameComponents(name1);
  const components2 = extractIndianNameComponents(name2);

  const firstNameSimilarity = calculateStringSimilarity(
    components1.firstName,
    components2.firstName,
  );
  const lastNameSimilarity = calculateStringSimilarity(components1.lastName, components2.lastName);

  if (components1.middleName && components2.middleName) {
    const middleNameSimilarity = calculateStringSimilarity(
      components1.middleName,
      components2.middleName,
    );
    return firstNameSimilarity * 0.4 + middleNameSimilarity * 0.2 + lastNameSimilarity * 0.4;
  }

  return firstNameSimilarity * 0.5 + lastNameSimilarity * 0.5;
}

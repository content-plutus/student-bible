export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[len1][len2];
}

export function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

export function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function compareNames(name1: string, name2: string, threshold: number = 0.8): boolean {
  const normalized1 = normalizeForComparison(name1);
  const normalized2 = normalizeForComparison(name2);

  const similarity = stringSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

export function comparePhoneNumbers(phone1: string, phone2: string): boolean {
  const normalized1 = phone1.replace(/\D/g, "");
  const normalized2 = phone2.replace(/\D/g, "");

  return normalized1 === normalized2;
}

export function compareEmails(email1: string, email2: string): boolean {
  const normalized1 = email1.toLowerCase().trim();
  const normalized2 = email2.toLowerCase().trim();

  return normalized1 === normalized2;
}

export function compareAddresses(
  address1: string,
  address2: string,
  threshold: number = 0.7,
): boolean {
  const normalized1 = normalizeForComparison(address1);
  const normalized2 = normalizeForComparison(address2);

  const similarity = stringSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

export function tokenize(str: string): string[] {
  return normalizeForComparison(str)
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

export function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

export function tokenBasedSimilarity(str1: string, str2: string): number {
  const tokens1 = tokenize(str1);
  const tokens2 = tokenize(str2);

  return jaccardSimilarity(tokens1, tokens2);
}

export function hybridNameSimilarity(name1: string, name2: string): number {
  const levenshteinSim = stringSimilarity(
    normalizeForComparison(name1),
    normalizeForComparison(name2),
  );

  const tokenSim = tokenBasedSimilarity(name1, name2);

  return levenshteinSim * 0.6 + tokenSim * 0.4;
}

export function compareIndianNames(
  firstName1: string,
  lastName1: string | null,
  firstName2: string,
  lastName2: string | null,
  threshold: number = 0.8,
): boolean {
  const fullName1 = `${firstName1} ${lastName1 || ""}`.trim();
  const fullName2 = `${firstName2} ${lastName2 || ""}`.trim();

  const similarity = hybridNameSimilarity(fullName1, fullName2);
  return similarity >= threshold;
}

export interface SimilarityScore {
  field: string;
  score: number;
  weight: number;
  weightedScore: number;
}

export function calculateOverallSimilarity(scores: SimilarityScore[]): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const weightedSum = scores.reduce((sum, s) => sum + s.weightedScore, 0);

  return weightedSum / totalWeight;
}

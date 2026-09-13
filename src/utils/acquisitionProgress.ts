/**
 * Utility functions for Land Acquisition Progress display and calculation.
 *
 * Data Integrity Rules:
 * - If Land_Acquisition_Progress_Percent exists and is a valid numeric value between 0 and 100:
 *   Display "XX%" using the actual dataset value (0% ONLY if dataset explicitly contains 0).
 * - If missing, null, undefined, empty, or unavailable:
 *   Display "Not Available" (never default to 0%).
 */

/**
 * Returns true if progress is a valid numeric percentage between 0 and 100.
 */
export function hasValidAcquisitionProgress(
  progress: number | null | undefined
): progress is number {
  return (
    progress !== null &&
    progress !== undefined &&
    typeof progress === 'number' &&
    !isNaN(progress) &&
    isFinite(progress) &&
    progress >= 0 &&
    progress <= 100
  );
}

/**
 * Extracts Land_Acquisition_Progress_Percent from a raw record adhering strictly to:
 * - If field exists and is a valid numeric value between 0 and 100 (including 0): return the number
 * - If field is missing, null, undefined, empty string, or non-numeric: return null
 * - Never fabricates or defaults to 0%
 */
export function extractLandAcquisitionProgress(raw: any): number | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidateKeys = [
    'Land_Acquisition_Progress_Percent',
    'landAcquisitionProgressPercent',
    'Land Acquisition Progress Percent',
    'land_acquisition_progress_percent',
    'Land_Acquisition_Progress',
    'landAcquisitionProgress',
    'acquisitionProgress',
    'acquisition_progress',
    'Acquisition Progress',
    'Acquisition_Progress',
    'progress',
    'Progress',
  ];

  let rawVal: any = undefined;
  for (const key of candidateKeys) {
    if (raw[key] !== undefined && raw[key] !== null) {
      rawVal = raw[key];
      break;
    }
  }

  if (rawVal === undefined || rawVal === null) return null;

  if (typeof rawVal === 'number') {
    if (!isNaN(rawVal) && isFinite(rawVal) && rawVal >= 0 && rawVal <= 100) {
      return Math.round(rawVal);
    }
    return null;
  }

  if (typeof rawVal === 'string') {
    const trimmed = rawVal.trim().replace(/%$/, '').trim();
    if (
      trimmed === '' ||
      ['null', 'undefined', 'n/a', 'na', 'not available', '-', 'none'].includes(
        trimmed.toLowerCase()
      )
    ) {
      return null;
    }
    const num = Number(trimmed);
    if (!isNaN(num) && isFinite(num) && num >= 0 && num <= 100) {
      return Math.round(num);
    }
    return null;
  }

  return null;
}

/**
 * Formats acquisition progress for UI display across all pages, popups, cards, tables, and tooltips.
 * Returns `${progress}%` (e.g. "0%", "38%", "75%") or "Not Available".
 */
export function formatAcquisitionProgress(
  progress: number | null | undefined
): string {
  if (hasValidAcquisitionProgress(progress)) {
    return `${progress}%`;
  }
  return 'Not Available';
}

/**
 * Calculates the average acquisition progress across a dataset.
 * Strictly EXCLUDES projects where Land_Acquisition_Progress_Percent is unavailable.
 * Missing values are NEVER treated as 0.
 *
 * Returns:
 * - { average: number; validCount: number } if at least 1 project has valid data
 * - { average: null; validCount: 0 } if no projects have valid data
 */
export function calculateAverageAcquisitionProgress(
  projects: Array<{
    acquisitionProgress?: number | null;
    landAcquisitionProgressPercent?: number | null;
  }>
): { average: number | null; validCount: number } {
  if (!projects || projects.length === 0) {
    return { average: null, validCount: 0 };
  }

  const validProgressValues: number[] = [];

  for (const p of projects) {
    const val =
      p.landAcquisitionProgressPercent !== undefined &&
      p.landAcquisitionProgressPercent !== null
        ? p.landAcquisitionProgressPercent
        : p.acquisitionProgress;

    if (hasValidAcquisitionProgress(val)) {
      validProgressValues.push(val);
    }
  }

  if (validProgressValues.length === 0) {
    return { average: null, validCount: 0 };
  }

  const sum = validProgressValues.reduce((acc, curr) => acc + curr, 0);
  const average = Math.round(sum / validProgressValues.length);

  return {
    average,
    validCount: validProgressValues.length,
  };
}

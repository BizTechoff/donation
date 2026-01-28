/**
 * Tri-state filter for boolean fields
 * Used in global filters for isAnash, isAlumni, etc.
 */
export enum TriStateFilter {
  /** Show all (no filter) */
  All = 'all',
  /** Show only true values */
  Yes = 'yes',
  /** Show only false values */
  No = 'no'
}

/**
 * Helper to check if a boolean value matches the filter
 */
export function matchesTriStateFilter(value: boolean | undefined, filter: TriStateFilter | undefined): boolean {
  if (filter === TriStateFilter.Yes) {
    return value === true;
  }
  if (filter === TriStateFilter.No) {
    return !((!!value) === true); // false or undefined
  }
  return true;
}

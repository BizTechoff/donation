/**
 * table-query.ts
 *
 * The SERVER half of the list-table mechanism. TableState (app/common/table)
 * owns the browser side - which column is sorted and in which direction - and
 * this file turns that same array into a remult orderBy, once, for every
 * controller that feeds a list.
 *
 * Why it exists: the block below was copy-pasted into donor-gift, reminder,
 * donation and target-audience controllers, and the copies drifted. Worse,
 * two of them tried to order by a DOTTED PATH:
 *
 *     orderBy['donor.lastName'] = direction     // silently does nothing
 *
 * remult orders by FIELDS OF THE ENTITY, so a dotted path is not resolved and
 * not reported - the query runs and the rows come back in their previous
 * order. That is exactly what the client sees as "sorting by donor does not
 * work" (O1, P5, P6, W1, W7): one root cause, five symptoms.
 *
 * The fix has two halves and this is the second one:
 *   1. the entity exposes the related value as a sqlExpression field
 *      (Donor.primaryPhone, DonorGift.donorName, ...) so Postgres can ORDER BY
 *      it inside the same query that loads the rows;
 *   2. buildOrderBy maps the column key the screen uses onto that field.
 *
 * Adding a sortable column is therefore one sqlExpression on the entity plus
 * one line in a map - never another copy of this function.
 */

export type SortDirection = 'asc' | 'desc'

export interface SortColumn {
  field: string
  direction: SortDirection
}

/**
 * Turns the screen's sort columns into a remult orderBy object.
 *
 * @param sortColumns what the user clicked, in priority order
 * @param defaultOrderBy used when nothing is sorted - the list's natural order
 * @param fieldMap      column key on the screen -> field name on the entity.
 *                      Only needed where the two differ; unmapped keys pass
 *                      through unchanged.
 *
 * A mapped value MUST be a real field of the entity (a plain column or a
 * sqlExpression field). A dotted path is dropped on purpose rather than
 * passed through, so a wrong mapping fails loudly in the log instead of
 * quietly returning unsorted rows.
 */
export function buildOrderBy(
  sortColumns: SortColumn[] | undefined,
  defaultOrderBy: Record<string, SortDirection>,
  fieldMap: Record<string, string> = {}
): Record<string, SortDirection> {
  if (!sortColumns || sortColumns.length === 0) return { ...defaultOrderBy }

  const orderBy: Record<string, SortDirection> = {}
  for (const sort of sortColumns) {
    const field = fieldMap[sort.field] ?? sort.field
    if (field.includes('.')) {
      console.warn(
        `[buildOrderBy] '${sort.field}' maps to '${field}', which is a related path and ` +
        `cannot be ordered by. Expose it as a sqlExpression field on the entity instead.`
      )
      continue
    }
    orderBy[field] = sort.direction
  }

  // Every requested column was unusable - fall back rather than return {},
  // which remult reads as "no order at all" and Postgres answers arbitrarily.
  return Object.keys(orderBy).length > 0 ? orderBy : { ...defaultOrderBy }
}


/**
 * Builds `case when <column> = '<code>' then '<label>' ... else <fallback> end`
 * for use inside a sqlExpression.
 *
 * The companion to buildOrderBy, and the answer to the other half of the same
 * problem: a column that DISPLAYS a Hebrew label but STORES an English code
 * cannot be ordered by the stored column - the rows come back in an order that
 * matches nothing the user can see. Translating in SQL, from the very map the
 * screen renders from (shared/enum/...), keeps the sorted value and the shown
 * value identical by construction.
 *
 * Codes and labels come from that map - never from user input - and single
 * quotes are doubled regardless, so the expression cannot be injected into.
 */
export function sqlCaseFromLabels(
  column: string,
  labels: Record<string, string>,
  fallback: string
): string {
  const q = (v: string) => `'${v.replace(/'/g, "''")}'`
  const whens = Object.entries(labels)
    .map(([code, label]) => `when ${column} = ${q(code)} then ${q(label)}`)
    .join(' ')
  return `case ${whens} else ${q(fallback)} end`
}

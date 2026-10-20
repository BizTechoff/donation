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
 * @param fieldMap      column key on the screen -> field name on the entity, or
 *                      a LIST of fields when one column displays more than one
 *                      value (certificates show the recipient with the donor
 *                      underneath) - they are applied in order as primary,
 *                      secondary, ... Only needed where screen and entity
 *                      differ; unmapped keys pass through unchanged.
 *
 * A mapped value MUST be a real field of the entity (a plain column or a
 * sqlExpression field). A dotted path is dropped on purpose rather than
 * passed through, so a wrong mapping fails loudly in the log instead of
 * quietly returning unsorted rows.
 */
export function buildOrderBy(
  sortColumns: SortColumn[] | undefined,
  defaultOrderBy: Record<string, SortDirection>,
  fieldMap: Record<string, string | string[]> = {}
): Record<string, SortDirection> {
  if (!sortColumns || sortColumns.length === 0) return withTieBreakerOrderBy({ ...defaultOrderBy })

  const orderBy: Record<string, SortDirection> = {}
  for (const sort of sortColumns) {
    const mapped = fieldMap[sort.field] ?? sort.field
    for (const field of Array.isArray(mapped) ? mapped : [mapped]) {
      if (field.includes('.')) {
        console.warn(
          `[buildOrderBy] '${sort.field}' maps to '${field}', which is a related path and ` +
          `cannot be ordered by. Expose it as a sqlExpression field on the entity instead.`
        )
        continue
      }
      orderBy[field] = sort.direction
    }
  }

  // Every requested column was unusable - fall back rather than return {},
  // which remult reads as "no order at all" and Postgres answers arbitrarily.
  return withTieBreakerOrderBy(Object.keys(orderBy).length > 0 ? orderBy : { ...defaultOrderBy })
}

/**
 * The last word of every sort (Israel's request): rows that are equal on
 * everything the user sorted by come newest-first, by creation time - and
 * always in the same order, so paging never shows a row twice or skips one.
 * Every list entity has createdDate. Applied unless the sort already uses it.
 */
export const TIE_BREAKER: SortColumn = { field: 'createdDate', direction: 'desc' }

function withTieBreakerOrderBy(orderBy: Record<string, SortDirection>): Record<string, SortDirection> {
  if (!(TIE_BREAKER.field in orderBy)) orderBy[TIE_BREAKER.field] = TIE_BREAKER.direction
  return orderBy
}

/** Same rule for in-memory sorts. */
export function withTieBreaker(sorts: SortColumn[] | undefined): SortColumn[] {
  const list = [...(sorts || [])]
  if (!list.some(s => s.field === TIE_BREAKER.field)) list.push({ ...TIE_BREAKER })
  return list
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

/**
 * Values computed in TypeScript per row, keyed by row id. Used for columns
 * that must NOT be copied into SQL because their rule is business logic -
 * money above all (effective amounts, currency conversion). See
 * findSortedPage.
 */
export type ComputedSort<T> = (rows: T[]) => Promise<Map<string, unknown>> | Map<string, unknown>

export interface SortedPageOptions<T> {
  where?: any
  include?: any
  sortColumns?: SortColumn[]
  defaultOrderBy: Record<string, SortDirection>
  fieldMap?: Record<string, string | string[]>
  /** Column key -> computes that column's value for every row. */
  computed?: Record<string, ComputedSort<T>>
  page?: number
  pageSize?: number
}

/**
 * One way to load a sorted page, for every list.
 *
 * - No computed column in the sort: Postgres sorts (buildOrderBy) and pages
 *   with LIMIT - the normal, fast path.
 * - A computed column is in the sort: the whole filtered set is loaded, the
 *   computed values come from the SAME TypeScript functions the screen
 *   displays with, the rows are sorted by the full sort chain, then paged.
 *   The sorted value and the shown value are identical by construction.
 *   Meant for small sets (campaigns: tens of rows) - a large list should
 *   expose its value as a sqlExpression instead.
 */
export async function findSortedPage<T extends { id: string }>(
  repo: { find: (o?: any) => Promise<T[]> },
  o: SortedPageOptions<T>
): Promise<T[]> {
  const computed = o.computed || {}
  const sorts = o.sortColumns || []
  const paging = o.page && o.pageSize ? { page: o.page, limit: o.pageSize } : {}

  if (!sorts.some(s => computed[s.field])) {
    return repo.find({
      where: o.where,
      include: o.include,
      orderBy: buildOrderBy(sorts, o.defaultOrderBy, o.fieldMap),
      ...paging
    })
  }

  const rows = await repo.find({ where: o.where, include: o.include })

  // Accessors: computed columns from their maps, the rest from the row
  // (through fieldMap where the column key and the entity field differ).
  const accessors: SortAccessors<T> = {}
  for (const s of sorts) {
    if (computed[s.field] && !accessors[s.field]) {
      const values = await computed[s.field](rows)
      accessors[s.field] = row => values.get(row.id)
    } else if (o.fieldMap?.[s.field] && !accessors[s.field]) {
      const mapped = o.fieldMap[s.field]
      const name = Array.isArray(mapped) ? mapped[0] : mapped
      accessors[s.field] = row => (row as any)[name]
    }
  }

  return pageRows(sortRows(rows, sorts, accessors), o.page, o.pageSize)
}

/** One page of an in-memory list; no page means all rows. */
export function pageRows<T>(rows: T[], page?: number, pageSize?: number): T[] {
  if (!page || !pageSize) return rows
  return rows.slice((page - 1) * pageSize, page * pageSize)
}

/**
 * In-memory sort - the ONE implementation, for the browser (small tables that
 * hold all their rows: a donor's donations, selection modals) and for the
 * server (findSortedPage with computed columns). app/common/table/table-sort
 * re-exports it.
 *
 * Two things the hand-written copies of this got wrong:
 * 1. They compared `row[field]` directly. A column that DISPLAYS a related or
 *    computed value - the campaign name, the payment method, the gift name -
 *    has no such property on the row, so the comparison ran on `undefined` and
 *    the order was arbitrary. Hence `accessors`: the caller says how to read
 *    the value the column actually shows.
 * 2. They compared Hebrew with `<` and `>`, which orders by UTF-16 code unit.
 *    localeCompare('he') is Hebrew alphabetical order.
 *
 * Empty values sort LAST in either direction (an empty cell is missing, not
 * smallest). When the user sorted by something, the tie-breaker (createdDate
 * desc) is appended - same rule as buildOrderBy. With no sort, the array keeps
 * the order it was loaded in. Returns a NEW array.
 */
export type SortAccessors<T> = Record<string, (row: T) => unknown>

export function sortRows<T>(rows: T[], sortColumns: SortColumn[] | undefined, accessors: SortAccessors<T> = {}): T[] {
  if (!sortColumns || sortColumns.length === 0) return [...rows]
  const sorts = withTieBreaker(sortColumns)

  const read = (row: T, field: string): unknown =>
    accessors[field] ? accessors[field](row) : (row as any)?.[field]
  const isEmpty = (v: unknown) => v === null || v === undefined || v === ''

  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const av = read(a, sort.field)
      const bv = read(b, sort.field)
      if (isEmpty(av) && isEmpty(bv)) continue
      if (isEmpty(av)) return 1
      if (isEmpty(bv)) return -1

      let cmp: number
      if (av instanceof Date || bv instanceof Date) {
        cmp = new Date(av as any).getTime() - new Date(bv as any).getTime()
      } else if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else if (typeof av === 'boolean' || typeof bv === 'boolean') {
        cmp = (av ? 1 : 0) - (bv ? 1 : 0)
      } else {
        cmp = String(av).localeCompare(String(bv), 'he')
      }
      if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

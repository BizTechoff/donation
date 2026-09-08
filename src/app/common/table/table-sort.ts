import { SortColumn } from './table-state'

/**
 * table-sort.ts
 *
 * The in-memory half of the table mechanism, for the SMALL tables that load
 * their whole result set in one query and page in the browser - a donor's
 * donations, a donor's gifts, a selection modal. There the server has nothing
 * left to order: every row is already here, so sorting the array IS sorting the
 * whole list. (That is the opposite of the main lists, which fetch one page at
 * a time - sorting the array there would only rearrange the rows on screen, the
 * defect behind P6.)
 *
 * Two things the hand-written copies of this got wrong:
 *
 * 1. They compared `row[field]` directly. A column that DISPLAYS a related or
 *    computed value - the campaign name, the payment method, the gift name -
 *    has no such property on the row, so the comparison ran on `undefined` and
 *    the order was arbitrary. Hence `accessors`: the caller says how to read
 *    the value the column actually shows.
 *
 * 2. They compared Hebrew with `<` and `>`, which orders by UTF-16 code unit.
 *    That is not Hebrew alphabetical order once niqqud, geresh or a mix of
 *    Hebrew and Latin appear. localeCompare('he') is.
 */

/** Reads the value a column displays. Falls back to the row's own property. */
export type SortAccessors<T> = Record<string, (row: T) => unknown>

/**
 * Returns a NEW array sorted by the given columns, in priority order.
 * Empty values sort LAST in ascending order, matching how the SQL-side lists
 * behave (allowNull + Postgres default), so the two halves agree.
 */
export function sortRows<T>(
  rows: T[],
  sortColumns: SortColumn[],
  accessors: SortAccessors<T> = {}
): T[] {
  if (!sortColumns || sortColumns.length === 0) return [...rows]

  const read = (row: T, field: string): unknown =>
    accessors[field] ? accessors[field](row) : (row as any)?.[field]

  const isEmpty = (v: unknown) => v === null || v === undefined || v === ''

  return [...rows].sort((a, b) => {
    for (const sort of sortColumns) {
      const av = read(a, sort.field)
      const bv = read(b, sort.field)

      // Empty last, regardless of direction - an empty cell is not "smallest",
      // it is missing, and burying it is what the user expects either way.
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

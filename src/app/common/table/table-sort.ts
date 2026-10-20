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

// 20.10.2026 - the implementation moved to shared/utils/table-query so the
// server (findSortedPage) sorts with the very same code. This file stays as
// the browser-side entry point; it also gains the tie-breaker there
// (createdDate desc after the user's columns).
export { sortRows, pageRows } from '../../../shared/utils/table-query'
export type { SortAccessors } from '../../../shared/utils/table-query'

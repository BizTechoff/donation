import { remult } from 'remult'
import { User } from '../../../shared/entity'

/**
 * table-state.ts
 *
 * Single source of truth for LIST TABLE BEHAVIOUR across the platform:
 * sorting, paging, scroll-reset and the persisted per-user sort.
 *
 * Why this exists: the same toggleSort/isSorted/paging block was copy-pasted
 * into 10+ components, and the copies drifted (async vs sync, MouseEvent vs
 * Event, preventDefault present in one and missing in another). That drift is
 * what the client reports as "sorting does not work in gifts / in reminders /
 * behaves differently on every click in donations" - three symptoms, one root.
 *
 * Deliberately NOT a shared table COMPONENT: every screen keeps its own
 * markup and SCSS. Shared logic, duplicated presentation - per the platform
 * rule "לוגיקה משותפת → קומפוננטה משותפת, שדות משותפים → שכפול".
 *
 * Usage:
 *   readonly table = new TableState({
 *     pageSize: 50,
 *     settingsKey: 'donorList',
 *     sortableFields: ['fullName', 'address'],
 *     scrollContainer: () => this.scrollableTable?.nativeElement,
 *     load: req => this.loadRows(req)
 *   })
 */

export type SortDirection = 'asc' | 'desc'

export interface SortColumn {
  field: string
  direction: SortDirection
}

export interface TableLoadRequest {
  page: number
  pageSize: number
  sort: SortColumn[]
}

export interface TableStateOptions {
  /** Fetches the rows. The component keeps ownership of its own row array. */
  load: (req: TableLoadRequest) => Promise<void>
  pageSize?: number
  /** When given, only these fields react to a header click. */
  sortableFields?: string[]
  /** Key under user.settings - the sort is persisted there per user. */
  settingsKey?: string
  /** Scrollable table body; reset to top on every reload. */
  scrollContainer?: () => HTMLElement | null | undefined
  /** How many page numbers to render. Default 5. */
  pageWindow?: number
}

export class TableState {
  sortColumns: SortColumn[] = []
  currentPage = 1
  pageSize: number
  totalCount = 0

  private readonly opts: TableStateOptions
  private settingsUser?: User

  constructor(opts: TableStateOptions) {
    this.opts = opts
    this.pageSize = opts.pageSize ?? 50
  }

  // ── paging state ────────────────────────────────────────────────────────

  /** 0 when there are no rows at all - so the footer shows 0 and not "1 of 0". */
  get totalPages(): number {
    return this.totalCount === 0 ? 0 : Math.ceil(this.totalCount / this.pageSize)
  }

  get rangeStart(): number {
    return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1
  }

  get rangeEnd(): number {
    return this.totalCount === 0 ? 0 : Math.min(this.currentPage * this.pageSize, this.totalCount)
  }

  get isFirstPage(): boolean {
    return this.currentPage <= 1
  }

  get isLastPage(): boolean {
    return this.totalPages === 0 || this.currentPage >= this.totalPages
  }

  // ── loading ─────────────────────────────────────────────────────────────

  async reload(): Promise<void> {
    await this.opts.load({
      page: this.currentPage,
      pageSize: this.pageSize,
      sort: this.sortColumns.map(s => ({ ...s }))
    })
    this.scrollToTop()
  }

  /** Any change that alters the result set (filter, search) starts at page 1. */
  async reloadFromFirstPage(): Promise<void> {
    this.currentPage = 1
    await this.reload()
  }

  scrollToTop(): void {
    const el = this.opts.scrollContainer?.()
    if (el) el.scrollTop = 0
  }

  // ── sorting ─────────────────────────────────────────────────────────────

  isSortable(field: string): boolean {
    return !this.opts.sortableFields || this.opts.sortableFields.includes(field)
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field)
  }

  /** '↑' / '↓', with the priority number appended while multi-sorting. */
  getSortIcon(field: string): string {
    const i = this.sortColumns.findIndex(s => s.field === field)
    if (i === -1) return ''
    const arrow = this.sortColumns[i].direction === 'asc' ? '↑' : '↓'
    return this.sortColumns.length > 1 ? `${arrow}${i + 1}` : arrow
  }

  /**
   * Plain click toggles the column between ascending and descending - two
   * states only. There is deliberately NO third "no sort" state: the client
   * reported three-clicks-three-behaviours as a defect (W5), and on the name
   * column a reset to the default order (lastName+firstName asc) is visually
   * identical to ascending, so the third click would look like nothing
   * happened. To get the natural order the user clicks the name column.
   * Ctrl/Cmd click builds a multi-column sort, and drops a column on its
   * third click - that is the way to clear a sort.
   */
  async toggleSort(field: string, event?: MouseEvent | Event): Promise<void> {
    if (!this.isSortable(field)) return

    const mouse = event as MouseEvent | undefined
    mouse?.preventDefault?.()
    mouse?.stopPropagation?.()

    const multi = !!(mouse && (mouse.ctrlKey || mouse.metaKey))
    const index = this.sortColumns.findIndex(s => s.field === field)

    if (multi) {
      if (index >= 0) {
        if (this.sortColumns[index].direction === 'asc') this.sortColumns[index].direction = 'desc'
        else this.sortColumns.splice(index, 1)
      } else {
        this.sortColumns.push({ field, direction: 'asc' })
      }
    } else if (index === 0 && this.sortColumns.length === 1) {
      this.sortColumns[0].direction = this.sortColumns[0].direction === 'asc' ? 'desc' : 'asc'
    } else {
      this.sortColumns = [{ field, direction: 'asc' }]
    }

    this.currentPage = 1
    await this.reload()
    await this.saveSettings()
  }

  // ── paging actions ──────────────────────────────────────────────────────

  async goToPage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return
    this.currentPage = page
    await this.reload()
  }

  async nextPage(): Promise<void> {
    if (this.isLastPage) return
    this.currentPage++
    await this.reload()
  }

  async previousPage(): Promise<void> {
    if (this.isFirstPage) return
    this.currentPage--
    await this.reload()
  }

  async firstPage(): Promise<void> {
    if (this.isFirstPage) return
    this.currentPage = 1
    await this.reload()
  }

  async lastPage(): Promise<void> {
    if (this.isLastPage) return
    this.currentPage = this.totalPages
    await this.reload()
  }

  getPageNumbers(): number[] {
    const pages: number[] = []
    const total = this.totalPages
    const window = this.opts.pageWindow ?? 5
    if (total <= 0) return pages

    if (total <= window) {
      for (let i = 1; i <= total; i++) pages.push(i)
      return pages
    }

    const half = Math.floor(window / 2)
    let start = Math.max(1, this.currentPage - half)
    const end = Math.min(total, start + window - 1)
    if (end - start < window - 1) start = Math.max(1, end - window + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  // ── persisted sort ──────────────────────────────────────────────────────

  /** Call once, before the first reload, so the saved sort is applied to it. */
  async loadSettings(): Promise<void> {
    const key = this.opts.settingsKey
    if (!key) return
    try {
      const userId = remult.user?.id
      if (!userId) return
      const user = await remult.repo(User).findId(userId, { useCache: false })
      if (!user) return
      this.settingsUser = user
      const saved = (user.settings as any)?.[key]
      if (Array.isArray(saved?.sort)) this.sortColumns = saved.sort
      if (typeof saved?.pageSize === 'number' && saved.pageSize > 0) this.pageSize = saved.pageSize
    } catch (error) {
      console.error('TableState.loadSettings', error)
    }
  }

  async saveSettings(): Promise<void> {
    const key = this.opts.settingsKey
    const user = this.settingsUser
    if (!key || !user) return
    try {
      if (!user.settings) (user as any).settings = {}
      const settings = user.settings as any
      if (!settings[key]) settings[key] = {}
      settings[key].sort = this.sortColumns
      await remult.repo(User).save(user)
    } catch (error) {
      console.error('TableState.saveSettings', error)
    }
  }
}

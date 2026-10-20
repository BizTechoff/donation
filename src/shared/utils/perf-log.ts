/**
 * perf-log.ts - console.time / console.timeEnd that are safe under concurrency.
 *
 * console.time keeps ONE timer per label for the whole Node process. Two
 * requests running the same BackendMethod at once (two lists loading, two
 * users) start the same label twice; the first timeEnd consumes it and the
 * second prints "Warning: No such label ... for console.timeEnd()". That was
 * the noise in the API log ([GlobalFilter] User.findId / TOTAL).
 *
 * Here each label holds a STACK of start times, so overlapping calls each get
 * their own start; an end without a start is silently ignored. Same output
 * format as console.timeEnd: "<label>: 12.345ms".
 */
const starts = new Map<string, number[]>()

const now = (): number =>
  typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()

export function timeStart(label: string): void {
  const list = starts.get(label)
  if (list) list.push(now())
  else starts.set(label, [now()])
}

export function timeEnd(label: string): void {
  const list = starts.get(label)
  const start = list?.pop()
  if (start === undefined) return
  if (list!.length === 0) starts.delete(label)
  console.log(`${label}: ${(now() - start).toFixed(3)}ms`)
}

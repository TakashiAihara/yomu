/**
 * DuckDB はシングルライター制約のため、書き込みを直列化する。
 * 読み取りは sql テンプレートタグを直接使用して並列実行可。
 *
 * 使い方:
 *   await writer.enqueue(() => sql`INSERT INTO entries ...`)
 */
export class Writer {
  private queue: Promise<unknown> = Promise.resolve()

  enqueue<T>(op: () => PromiseLike<T>): Promise<T> {
    const next = this.queue.then(() => op())
    this.queue = next.catch(() => {})
    return next as Promise<T>
  }
}

/**
 * Batch loader simple (anti N+1) para resolvers GraphQL.
 * Agrupa IDs en un tick y ejecuta una sola query.
 */

type BatchFn<T> = (ids: number[]) => Promise<Map<number, T>>;

export function createBatchLoader<T>(batchFn: BatchFn<T>) {
  let queue: number[] = [];
  let resolvers: Array<{
    id: number;
    resolve: (value: T | null) => void;
    reject: (err: unknown) => void;
  }> = [];
  let scheduled = false;

  async function flush(): Promise<void> {
    const ids = [...new Set(queue)];
    const pending = resolvers;
    queue = [];
    resolvers = [];
    scheduled = false;

    try {
      const map = await batchFn(ids);
      for (const item of pending) {
        item.resolve(map.get(item.id) ?? null);
      }
    } catch (err) {
      for (const item of pending) {
        item.reject(err);
      }
    }
  }

  return function load(id: number): Promise<T | null> {
    return new Promise<T | null>((resolve, reject) => {
      queue.push(id);
      resolvers.push({ id, resolve, reject });
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(() => {
          void flush();
        });
      }
    });
  };
}

type Options<Item> = {
  items: Item[];
  concurrency: number;
  runTask: (item: Item) => Promise<void>;
};

export async function runTasksWithConcurrency<Item>({ items, concurrency, runTask }: Options<Item>) {
  if (items.length === 0) {
    return;
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  const pendingItems = [...items];
  const workers = Array.from({ length: workerCount }, async () => {
    while (pendingItems.length > 0) {
      const item = pendingItems.shift();
      if (item === undefined) {
        return;
      }

      await runTask(item);
    }
  });

  await Promise.all(workers);
}

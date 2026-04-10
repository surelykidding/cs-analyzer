import { describe, expect, it } from 'vite-plus/test';
import { runTasksWithConcurrency } from './run-tasks-with-concurrency';

describe('runTasksWithConcurrency', () => {
  it('should process all items', async () => {
    const processedItems: number[] = [];

    await runTasksWithConcurrency({
      items: [1, 2, 3],
      concurrency: 2,
      runTask: async (item) => {
        processedItems.push(item);
      },
    });

    expect(processedItems.sort((itemA, itemB) => itemA - itemB)).toEqual([1, 2, 3]);
  });

  it('should not exceed the configured concurrency', async () => {
    let runningTaskCount = 0;
    let maxRunningTaskCount = 0;

    await runTasksWithConcurrency({
      items: [1, 2, 3, 4],
      concurrency: 2,
      runTask: async () => {
        runningTaskCount += 1;
        maxRunningTaskCount = Math.max(maxRunningTaskCount, runningTaskCount);
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
        runningTaskCount -= 1;
      },
    });

    expect(maxRunningTaskCount).toBe(2);
  });
});

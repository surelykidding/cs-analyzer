type TaskKind = 'pistol' | 'all';

const taskQueueByChecksum = new Map<string, Promise<void>>();
const activeTaskByKey = new Map<string, Promise<void>>();

function getTaskKey(checksum: string, kind: TaskKind) {
  return `${checksum}:${kind}`;
}

export function runTacticsPositionsTask<T>(checksum: string, kind: TaskKind, task: () => Promise<T>): Promise<T> {
  if (kind === 'pistol') {
    const activeAllTask = activeTaskByKey.get(getTaskKey(checksum, 'all'));
    if (activeAllTask !== undefined) {
      return activeAllTask as Promise<T>;
    }
  }

  const taskKey = getTaskKey(checksum, kind);
  const existingTask = activeTaskByKey.get(taskKey);
  if (existingTask !== undefined) {
    return existingTask as Promise<T>;
  }

  const previousTask = taskQueueByChecksum.get(checksum) ?? Promise.resolve();
  const taskPromise = previousTask.then(task, task);
  const queueCompletion = taskPromise.then(
    () => undefined,
    () => undefined,
  );

  taskQueueByChecksum.set(checksum, queueCompletion);
  const trackedTaskPromise = taskPromise.finally(() => {
    if (activeTaskByKey.get(taskKey) === trackedTaskPromise) {
      activeTaskByKey.delete(taskKey);
    }
  });
  activeTaskByKey.set(taskKey, trackedTaskPromise as Promise<void>);

  queueCompletion.finally(() => {
    if (taskQueueByChecksum.get(checksum) === queueCompletion) {
      taskQueueByChecksum.delete(checksum);
    }
  });

  return trackedTaskPromise as Promise<T>;
}

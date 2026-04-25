import fs from 'node:fs';
import path from 'node:path';

export function getStaticFolderPath() {
  const staticFolderPathFromEnv = process.env.CSDM_STATIC_FOLDER_PATH;
  if (staticFolderPathFromEnv !== undefined) {
    return staticFolderPathFromEnv;
  }

  const candidatePaths = [
    // We are in the "out" folder in dev mode and "app.asar" when the app is packaged, so we need to go up one level.
    path.join(__dirname, '..', 'static'),
    // Bundled utility scripts such as benchmarks may live in "out/<subfolder>" and need one more level.
    path.join(__dirname, '..', '..', 'static'),
    path.join(process.cwd(), 'static'),
  ];

  const resolvedStaticFolderPath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));
  return resolvedStaticFolderPath ?? candidatePaths[0];
}

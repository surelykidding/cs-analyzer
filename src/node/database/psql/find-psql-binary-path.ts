import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isWindows } from 'csdm/node/os/is-windows';

const execFileAsync = promisify(execFile);

async function isExistingFile(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findPsqlFromWhere() {
  if (!isWindows) {
    return undefined;
  }

  try {
    const { stdout } = await execFileAsync('where.exe', ['psql']);
    const candidates = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '');

    for (const candidate of candidates) {
      if (await isExistingFile(candidate)) {
        return candidate;
      }
    }
  } catch {
    // Ignore lookup errors and continue with common install locations.
  }

  return undefined;
}

async function findPsqlInCommonWindowsInstallLocations() {
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter((value): value is string => {
    return value !== undefined && value !== '';
  });

  for (const root of roots) {
    const postgresqlRootPath = path.join(root, 'PostgreSQL');

    try {
      const versionDirectories = await readdir(postgresqlRootPath, { withFileTypes: true });
      const sortedDirectories = versionDirectories
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => {
          return right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' });
        });

      for (const versionDirectory of sortedDirectories) {
        const psqlPath = path.join(postgresqlRootPath, versionDirectory, 'bin', 'psql.exe');

        if (await isExistingFile(psqlPath)) {
          return psqlPath;
        }
      }
    } catch {
      // Ignore missing folders and continue with the next root.
    }
  }

  return undefined;
}

export async function findPsqlBinaryPath() {
  if (!isWindows) {
    return 'psql';
  }

  const psqlPathFromWhere = await findPsqlFromWhere();
  if (psqlPathFromWhere !== undefined) {
    return psqlPathFromWhere;
  }

  const psqlPathFromInstallLocation = await findPsqlInCommonWindowsInstallLocations();
  if (psqlPathFromInstallLocation !== undefined) {
    return psqlPathFromInstallLocation;
  }

  return 'psql';
}

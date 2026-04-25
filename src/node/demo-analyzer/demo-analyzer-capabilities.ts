import { constants as fsConstants } from 'node:fs';
import { spawn } from 'node:child_process';
import fs from 'fs-extra';
import flags from './demo-analyzer-flags.json';
import { DemoAnalyzerIncompatibleError } from './demo-analyzer-incompatible-error';

export const coreDemoAnalyzerFlags = flags.core;
export const optionalDemoAnalyzerFlags = flags.optional;
export const tacticsDemoAnalyzerFlags = flags.tactics;
export const allKnownDemoAnalyzerFlags = [
  ...coreDemoAnalyzerFlags,
  ...optionalDemoAnalyzerFlags,
  ...tacticsDemoAnalyzerFlags,
];

export type DemoAnalyzerCapabilities = {
  supportedFlags: string[];
  source: 'help' | 'binary';
};

const capabilitiesCache = new Map<string, Promise<DemoAnalyzerCapabilities>>();

function isEmbeddedBinaryScannableFlag(flag: string) {
  return tacticsDemoAnalyzerFlags.includes(flag);
}

export function parseSupportedDemoAnalyzerFlags(output: string, knownFlags = allKnownDemoAnalyzerFlags) {
  return knownFlags.filter((flag) => {
    const escapedFlag = flag.replaceAll('-', '\\-');
    const flagPattern = new RegExp(`(^|[^A-Za-z0-9-])-?${escapedFlag}($|[^A-Za-z0-9-])`);

    return flagPattern.test(output) || (isEmbeddedBinaryScannableFlag(flag) && output.includes(flag));
  });
}

export function getMissingDemoAnalyzerFlags(supportedFlags: string[], requiredFlags: string[]) {
  return requiredFlags.filter((flag) => {
    return !supportedFlags.includes(flag);
  });
}

function readHelpOutput(executablePath: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(executablePath, ['-help'], {
      windowsHide: true,
    });
    let output = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      output += data.toString();
    });

    child.on('error', reject);
    child.on('exit', () => {
      if (output.trim() === '') {
        reject(new Error('Demo analyzer help output is empty'));
        return;
      }

      resolve(output);
    });
  });
}

async function readBinaryOutput(executablePath: string) {
  return (await fs.readFile(executablePath)).toString('latin1');
}

async function detectDemoAnalyzerCapabilities(executablePath: string): Promise<DemoAnalyzerCapabilities> {
  try {
    const helpOutput = await readHelpOutput(executablePath);
    return {
      supportedFlags: parseSupportedDemoAnalyzerFlags(helpOutput),
      source: 'help',
    };
  } catch (error) {
    const binaryOutput = await readBinaryOutput(executablePath);

    return {
      supportedFlags: parseSupportedDemoAnalyzerFlags(binaryOutput),
      source: 'binary',
    };
  }
}

export async function getDemoAnalyzerCapabilities(executablePath: string) {
  let capabilities = capabilitiesCache.get(executablePath);
  if (capabilities === undefined) {
    capabilities = detectDemoAnalyzerCapabilities(executablePath);
    capabilitiesCache.set(executablePath, capabilities);
  }

  return capabilities;
}

export function clearDemoAnalyzerCapabilitiesCache() {
  capabilitiesCache.clear();
}

export async function assertDemoAnalyzerCompatibility({
  executablePath,
  requiredFlags,
  platform = process.platform,
}: {
  executablePath: string;
  requiredFlags: string[];
  platform?: NodeJS.Platform;
}) {
  if (!(await fs.pathExists(executablePath))) {
    throw new DemoAnalyzerIncompatibleError(
      `The bundled demo analyzer was not found at "${executablePath}". Run the dependency install step for this platform.`,
      { executablePath, missingFlags: requiredFlags },
    );
  }

  if (platform !== 'win32') {
    try {
      await fs.access(executablePath, fsConstants.X_OK);
    } catch (error) {
      throw new DemoAnalyzerIncompatibleError(
        `The bundled demo analyzer is not executable at "${executablePath}". Reinstall dependencies to restore executable permissions.`,
        { executablePath },
      );
    }
  }

  const capabilities = await getDemoAnalyzerCapabilities(executablePath);
  const missingFlags = getMissingDemoAnalyzerFlags(capabilities.supportedFlags, requiredFlags);
  if (missingFlags.length > 0) {
    throw new DemoAnalyzerIncompatibleError(
      `The bundled demo analyzer is incompatible with this CS Analyzer build. Missing required flags: ${missingFlags.join(
        ', ',
      )}.`,
      { executablePath, missingFlags },
    );
  }

  return capabilities;
}

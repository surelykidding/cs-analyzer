import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'fs-extra';

const currentFolderPath = fileURLToPath(new URL('.', import.meta.url));
const rootFolderPath = path.resolve(currentFolderPath, '..');
const analyzerSourcePath = path.join(rootFolderPath, 'tools', 'demo-analyzer', 'cs-demo-analyzer-enhanced');
const staticFolderPath = path.join(rootFolderPath, 'static');
const tempFolderPath = path.join(rootFolderPath, '.tmp');
const enhancedAnalyzerFlags = ['position-entities', 'position-window-start-seconds', 'position-window-end-seconds'];

const supportedTargets = {
  'darwin-arm64': { goos: 'darwin', goarch: 'arm64', binaryName: 'csda' },
  'darwin-x64': { goos: 'darwin', goarch: 'amd64', binaryName: 'csda' },
  'linux-arm64': { goos: 'linux', goarch: 'arm64', binaryName: 'csda' },
  'linux-x64': { goos: 'linux', goarch: 'amd64', binaryName: 'csda' },
  'win32-x64': { goos: 'windows', goarch: 'amd64', binaryName: 'csda.exe' },
};

export function getEnhancedDemoAnalyzerTarget(targetName) {
  const target = supportedTargets[targetName];
  if (target === undefined) {
    throw new Error(
      `Unsupported target "${targetName}". Supported targets: ${Object.keys(supportedTargets).join(', ')}`,
    );
  }

  return target;
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--target') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value after --target');
      }

      options.target = value;
      index++;
      continue;
    }

    if (arg === '--output') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value after --output');
      }

      options.output = value;
      index++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log('Usage: node ./scripts/build-enhanced-demo-analyzer.mjs [--target <platform-arch>] [--output <path>]');
  console.log('Supported targets:');
  for (const target of Object.keys(supportedTargets)) {
    console.log(`  - ${target}`);
  }
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit',
    });

    child.once('error', (error) => {
      reject(error);
    });

    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

export async function supportsEnhancedDemoAnalyzer(binaryPath) {
  if (!(await fs.pathExists(binaryPath))) {
    return false;
  }

  const binaryContent = (await fs.readFile(binaryPath)).toString('latin1');
  return enhancedAnalyzerFlags.every((flag) => binaryContent.includes(flag));
}

export async function buildEnhancedDemoAnalyzer({
  targetName = `${process.platform}-${process.arch}`,
  outputPath,
} = {}) {
  const target = getEnhancedDemoAnalyzerTarget(targetName);
  const resolvedOutputPath = path.resolve(outputPath ?? path.join(staticFolderPath, target.binaryName));
  const goBuildCachePath = process.env.GOCACHE ?? path.join(tempFolderPath, 'go-build-cache');
  const goModCachePath = process.env.GOMODCACHE ?? path.join(tempFolderPath, 'go-mod-cache');
  const goPath = process.env.GOPATH ?? path.join(tempFolderPath, 'go');

  await Promise.all([
    fs.ensureDir(path.dirname(resolvedOutputPath)),
    fs.ensureDir(goBuildCachePath),
    fs.ensureDir(goModCachePath),
    fs.ensureDir(goPath),
  ]);

  const environment = {
    ...process.env,
    CGO_ENABLED: '0',
    GOCACHE: goBuildCachePath,
    GOMODCACHE: goModCachePath,
    GOPATH: goPath,
    GOTELEMETRY: process.env.GOTELEMETRY ?? 'off',
    GOARCH: target.goarch,
    GOOS: target.goos,
  };

  await run('go', ['build', '-trimpath', '-o', resolvedOutputPath, './cmd/cli'], {
    cwd: analyzerSourcePath,
    env: environment,
  });

  if (!(await supportsEnhancedDemoAnalyzer(resolvedOutputPath))) {
    throw new Error(`Built analyzer at ${resolvedOutputPath} is missing the enhanced tactics flags`);
  }

  console.log(`Built enhanced demo analyzer for ${targetName}: ${resolvedOutputPath}`);

  return resolvedOutputPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  await buildEnhancedDemoAnalyzer({
    targetName: options.target,
    outputPath: options.output,
  });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

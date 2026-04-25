import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import esbuild from 'esbuild';
import nativeNodeModulesPlugin from './esbuild-native-node-modules-plugin.mjs';
import { node } from './electron-vendors.mjs';

const currentFolderPath = fileURLToPath(new URL('.', import.meta.url));
const rootFolderPath = path.resolve(currentFolderPath, '..');
const srcFolderPath = path.join(rootFolderPath, 'src');
const outputFolderPath = path.join(rootFolderPath, 'out', 'benchmarks');

const benchmarkEntries = {
  'generate-positions': {
    entryPoint: path.join(rootFolderPath, 'scripts', 'benchmarks', 'generate-positions.ts'),
    outputFile: path.join(outputFolderPath, 'generate-positions.cjs'),
  },
  'tactics-batch-concurrency': {
    entryPoint: path.join(rootFolderPath, 'scripts', 'benchmarks', 'tactics-batch-concurrency.ts'),
    outputFile: path.join(outputFolderPath, 'tactics-batch-concurrency.cjs'),
  },
};

async function main() {
  const requestedBenchmarks = process.argv.slice(2);
  const benchmarkNames = requestedBenchmarks.length > 0 ? requestedBenchmarks : Object.keys(benchmarkEntries);

  for (const benchmarkName of benchmarkNames) {
    if (!(benchmarkName in benchmarkEntries)) {
      throw new Error(
        `Unknown benchmark "${benchmarkName}". Supported benchmarks: ${Object.keys(benchmarkEntries).join(', ')}`,
      );
    }
  }

  await fs.ensureDir(outputFolderPath);

  for (const benchmarkName of benchmarkNames) {
    const benchmark = benchmarkEntries[benchmarkName];
    await esbuild.build({
      alias: {
        csdm: srcFolderPath,
        fdir: './node_modules/fdir/dist/index.cjs',
      },
      bundle: true,
      define: {
        IS_DEV: 'true',
        IS_PRODUCTION: 'false',
      },
      entryPoints: [benchmark.entryPoint],
      external: ['electron', 'pg-native', '@aws-sdk/client-s3'],
      format: 'cjs',
      mainFields: ['module', 'main'],
      minify: false,
      outfile: benchmark.outputFile,
      platform: 'node',
      plugins: [nativeNodeModulesPlugin],
      sourcemap: true,
      target: `node${node}`,
    });

    console.log(`Built analyzer benchmark: ${benchmarkName}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}

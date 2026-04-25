import { CorruptedDemoError } from './corrupted-demo-error';
import { DemoAnalyzerIncompatibleError } from './demo-analyzer-incompatible-error';

type DemoAnalyzerErrorContext = {
  command?: string;
  executablePath?: string;
};

function quoteCommandArgument(value: string) {
  if (value === '' || /\s/.test(value)) {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  return value;
}

export function buildDemoAnalyzerCommand(executablePath: string, args: string[]) {
  return [quoteCommandArgument(executablePath), ...args.map(quoteCommandArgument)].join(' ');
}

function isIncompatibleFlagError(output: string) {
  return ['flag provided but not defined', 'unknown flag', 'invalid flag', 'invalid value', 'Usage of'].some(
    (pattern) => output.toLowerCase().includes(pattern.toLowerCase()),
  );
}

export function buildDemoAnalyzerError(
  stderrOutput: string,
  exitCode: number | null,
  context: DemoAnalyzerErrorContext = {},
) {
  const normalizedOutput = stderrOutput.replaceAll('\u0000', '').trim();
  if (normalizedOutput.includes('ErrUnexpectedEndOfDemo')) {
    return new CorruptedDemoError();
  }

  const firstLine = normalizedOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '');

  if (isIncompatibleFlagError(normalizedOutput)) {
    return new DemoAnalyzerIncompatibleError(
      'The bundled demo analyzer is incompatible with this CS Analyzer build. Please update the analyzer adapter or use a compatible analyzer binary.',
      {
        command: context.command,
        executablePath: context.executablePath,
        stderrFirstLine: firstLine,
        exitCode,
      },
    );
  }

  if (firstLine?.includes('unable to find existing entity')) {
    return new Error(
      'The bundled demo analyzer crashed while parsing this demo ("unable to find existing entity"). This demo cannot be imported automatically yet.',
    );
  }

  if (firstLine !== undefined) {
    return new Error(firstLine);
  }

  return new Error(`demo analyzer exited with code ${exitCode ?? 'unknown'}`);
}

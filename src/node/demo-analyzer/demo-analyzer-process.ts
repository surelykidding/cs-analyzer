import { CorruptedDemoError } from './corrupted-demo-error';

function quoteCommandArgument(value: string) {
  if (value === '' || /\s/.test(value)) {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  return value;
}

export function buildDemoAnalyzerCommand(executablePath: string, args: string[]) {
  return [quoteCommandArgument(executablePath), ...args.map(quoteCommandArgument)].join(' ');
}

export function buildDemoAnalyzerError(stderrOutput: string, exitCode: number | null) {
  const normalizedOutput = stderrOutput.replaceAll('\u0000', '').trim();
  if (normalizedOutput.includes('ErrUnexpectedEndOfDemo')) {
    return new CorruptedDemoError();
  }

  const firstLine = normalizedOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '');

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

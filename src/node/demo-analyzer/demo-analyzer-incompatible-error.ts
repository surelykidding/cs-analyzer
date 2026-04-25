import { ErrorCode } from 'csdm/common/error-code';
import { BaseError } from 'csdm/node/errors/base-error';

export type DemoAnalyzerIncompatibleErrorCause = {
  executablePath?: string;
  command?: string;
  missingFlags?: string[];
  stderrFirstLine?: string;
  exitCode?: number | null;
};

export class DemoAnalyzerIncompatibleError extends BaseError {
  public constructor(message: string, cause?: DemoAnalyzerIncompatibleErrorCause) {
    super(ErrorCode.DemoAnalyzerIncompatible, cause);
    this.message = message;
  }
}

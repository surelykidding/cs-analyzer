import { describe, expect, it } from 'vite-plus/test';
import { extractFaceitMatchId } from './extract-faceit-match-id';

describe('extractFaceitMatchId', () => {
  it('should return raw match ids unchanged', () => {
    expect(extractFaceitMatchId('1-df68bd34-a892-4a38-8f09-fb284e2a86c4')).toBe(
      '1-df68bd34-a892-4a38-8f09-fb284e2a86c4',
    );
  });

  it('should extract match ids from FACEIT room urls', () => {
    expect(extractFaceitMatchId('https://www.faceit.com/en/cs2/room/1-df68bd34-a892-4a38-8f09-fb284e2a86c4')).toBe(
      '1-df68bd34-a892-4a38-8f09-fb284e2a86c4',
    );
  });

  it('should trim whitespace', () => {
    expect(extractFaceitMatchId('  1-df68bd34-a892-4a38-8f09-fb284e2a86c4  ')).toBe(
      '1-df68bd34-a892-4a38-8f09-fb284e2a86c4',
    );
  });
});

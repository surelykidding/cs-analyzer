import { describe, expect, it } from 'vite-plus/test';
import { extract5EPlayMatchId } from './extract-5eplay-match-id';

describe('extract5EPlayMatchId', () => {
  it('should extract the match id from a 5EPlay URL', () => {
    expect(extract5EPlayMatchId('https://arena.5eplay.com/data/match/123456789')).toBe('123456789');
  });

  it('should return the raw id when a plain match id is provided', () => {
    expect(extract5EPlayMatchId('123456789')).toBe('123456789');
  });

  it('should return an empty string when the value is invalid', () => {
    expect(extract5EPlayMatchId('https://arena.5eplay.com/data/player/123456789')).toBe('');
  });
});

import React from 'react';
import { PerfectWorldActionBar } from './perfect-world-action-bar';
import { PerfectWorldLastMatchesLoader } from './perfect-world-last-matches-loader';

export function PerfectWorldLastMatches() {
  return (
    <>
      <PerfectWorldActionBar />
      <PerfectWorldLastMatchesLoader />
    </>
  );
}

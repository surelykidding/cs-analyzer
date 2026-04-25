# Demo Analyzer Sources

This directory vendors the sources used to build the enhanced `static/csda` / `static/csda.exe` binary that powers tactics and scouting analysis in CS Analyzer.

## Layout

- `cs-demo-analyzer-enhanced`
  Based on `github.com/akiver/cs-demo-analyzer`, with the local tactics-oriented flags and filtering logic that this project depends on.
- `demoinfocs-golang`
  Vendored parser dependency used by the enhanced analyzer. This snapshot includes the CS2 compatibility fixes required by the latest FACEIT demos.

## Why it is vendored

The npm package for `@akiver/cs-demo-analyzer` ships the stock binary, which does not include this project's custom tactics flags such as `-position-entities`. Keeping the source here makes the shipped binary reproducible and keeps the CS2 compatibility fixes close to the app code that depends on them.

See [../../docs/analyzer.md](../../docs/analyzer.md) for the build flow, benchmark commands, and a summary of the local patches.

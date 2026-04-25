# Enhanced Demo Analyzer

CS Analyzer does not rely on the stock `@akiver/cs-demo-analyzer` binary alone. The app ships an enhanced build that keeps the original analyzer behavior for full parsing, while adding tactics-specific fast paths and the CS2 compatibility fixes required by recent FACEIT demos.

## Repository layout

- `static/csda` / `static/csda.exe`
  The binary shipped by the desktop app.
- `tools/demo-analyzer/cs-demo-analyzer-enhanced`
  The vendored Go source used to rebuild the shipped analyzer binary.
- `tools/demo-analyzer/demoinfocs-golang`
  The vendored parser dependency used by the analyzer source above.
- `scripts/build-enhanced-demo-analyzer.mjs`
  Rebuilds the enhanced analyzer from the vendored Go source.
- `scripts/benchmarks`
  Benchmark sources that compare full parsing, tactics parsing, pistol parsing, and pistol batch concurrency.

## Why this project uses a custom analyzer

The stock analyzer can export every position in a demo, but the tactics view in CS Analyzer only needs a narrow slice of that data:

- specific rounds
- specific entity types
- a short time window after freeze time ends

The enhanced analyzer keeps those filters inside the parser so we avoid exporting and importing data that the tactics UI will throw away anyway.

The key custom flags are implemented in `tools/demo-analyzer/cs-demo-analyzer-enhanced/pkg/cli/cli.go` and consumed in `tools/demo-analyzer/cs-demo-analyzer-enhanced/pkg/api/analyzer.go`.

- `-rounds`
  Exports only the requested rounds.
- `-position-entities`
  Restricts position capture to `players`, `grenades`, `infernos`, `hostages`, `chickens`, or `all`.
- `-position-window-start-seconds`
  Ignores positions before the configured point after freeze time ends.
- `-position-window-end-seconds`
  Stops capturing positions once the configured time window is over.
  On the app side, `src/node/demo/analyze-tactics-positions.ts` only requests player positions for a short time window, and the UI still parallelizes multiple demos at the task layer with `src/common/run-tasks-with-concurrency.ts`.

## CS2 compatibility patches

The current vendored sources also carry the fixes that were needed after the recent CS2 updates:

- `tools/demo-analyzer/demoinfocs-golang/pkg/demoinfocs/sendtables2/field_decoder.go`
  Adds `CGlobalSymbol` string decoding.
- `tools/demo-analyzer/demoinfocs-golang/pkg/demoinfocs/sendtables2/field_decoder.go`
  Adds `CUtlBinaryBlock` decoding so newer Source 2 fields no longer shift the field stream and corrupt entity parsing.
- `tools/demo-analyzer/cs-demo-analyzer-enhanced/pkg/api/shot.go`
  Treats `m_aimPunchAngle` as optional for newer demos where the property may be absent after Valve updates.

These changes are what allow the enhanced build to keep its custom tactics flags and still parse the latest FACEIT demo format.

## Rebuilding the shipped binary

Prerequisites:

- Go installed and available on `PATH`
- Node dependencies installed for this repository

Build the analyzer for the current machine:

```bash
npm run analyzer:build
```

Build a specific target explicitly:

```bash
npm run analyzer:build -- --target win32-x64
```

Write to a custom path instead of `static/csda`:

```bash
npm run analyzer:build -- --target win32-x64 --output D:\\temp\\csda.exe
```

The build script verifies that the resulting binary still contains the enhanced tactics flags before it succeeds.

## Release flow

Do not publish packages with the stock npm analyzer copied into `static`.

The release/build flow must compile the enhanced analyzer from the vendored source first, then let Electron Builder package the platform-specific binary:

```bash
npm run analyzer:build -- --target darwin-arm64
npm run analyzer:build -- --target darwin-x64
npm run analyzer:build -- --target linux-x64
npm run analyzer:build -- --target win32-x64
npm run build
```

`electron-builder` also calls `installDemoAnalyzer(..., { requireEnhanced: true })` in `beforePack`, so packaging fails instead of silently falling back to an incompatible stock analyzer.

## Benchmarks

The benchmark sources are intentionally kept in the repository because they are useful whenever we change the analyzer or the tactics import flow.

Available commands:

```bash
npm run benchmark:analyzer:positions
npm run benchmark:analyzer:tactics-concurrency
```

What they do:

- `benchmark:analyzer:positions`
  Clones the current Postgres database, clears stored positions for the two latest imported CS2 demos, and compares:
  - full position generation
  - tactics position generation
- `benchmark:analyzer:tactics-concurrency`
  Clones the current Postgres database and compares serial tactics generation versus a 2-worker parallel batch.

Benchmark prerequisites:

- the local app settings must already point to a working Postgres instance
- the database must already contain at least two imported CS2 matches
- the repository dependencies must be installed

Both benchmarks restore the original settings file after they finish and print structured JSON that can be pasted into notes or pull requests.

## Validation recipe

When validating analyzer changes against the FACEIT demo that originally regressed, the following command is a good smoke test on Windows:

```powershell
.\static\csda.exe `
  -demo-path "C:\Users\oolnl\Downloads\1-e6581cfc-1af6-4f1d-8c11-daf2df5eca2d-1-1.dem" `
  -output ".tmp\probe-output" `
  -format csv `
  -positions=true `
  -position-entities=players `
  -position-window-start-seconds=10 `
  -position-window-end-seconds=20 `
  -source=faceit
```

If that succeeds and the packaged app still keeps the enhanced binary during `npm run build` / `npm run package`, the critical tactics path is in a good state.

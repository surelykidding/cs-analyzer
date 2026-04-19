# CS Analyzer Windows Testing Guide

This guide is for testers using the packaged Windows beta build of `CS Analyzer 1.0.0-beta.1`.

## What This Build Focuses On

- Team tactics analysis
- FACEIT scouting and tactics review
- 5EPlay last-match downloads and scouting
- Economy filters: `Pistol`, `Eco`, `Semi`, `ForceBuy`, `Full`
- Faster windowed tactics positions
- Perfect World account import, login, scouting, and demo processing

## Files You Will Receive

- `CS Analyzer Setup 1.0.0-beta.1.exe`
  Use this if you want a standard Windows installation with Start Menu integration.
- `CS Analyzer Portable 1.0.0-beta.1.exe`
  Use this if you want to keep everything in one folder and run it without installing.

Both builds are for Windows testing. Beta builds use manual updates from GitHub pre-releases. In-app auto-update is intentionally disabled.

## Requirements

Install these before launching the app:

- Windows 10 or newer
- PostgreSQL
- `psql` available in your system `PATH`

Quick check:

```powershell
psql --version
```

If that command fails, install the PostgreSQL client tools and reopen your terminal.

## Recommended PostgreSQL Test Values

The app defaults are:

- Host: `127.0.0.1`
- Port: `5432`
- Username: `postgres`
- Password: `password`
- Database: `csdm`

You can use different values, but using the defaults makes testing easier.

## First Launch

1. Start `CS Analyzer`.
2. If the database connection screen appears, enter your PostgreSQL details.
3. On a clean setup, the app will create the database and run migrations automatically.
4. Open `Settings` after the app loads.

## Download Folder

Set a dedicated folder in `Settings > Downloads`.

All startup/background demo auto-download switches are disabled by default in this beta.

- Enable them manually only if you want polling or unattended downloads.
- Leaving them off is the expected default behavior for this test build.

Recommendations:

- Use an empty folder created just for this beta.
- Do not rename demo files while the app is processing them.
- Keep enough disk space for downloaded demos and extracted archives.

This folder is important for scouting workflows and imported demo processing.

## FACEIT Setup

### API key

You do not need to paste a FACEIT API key for this beta.

- The build already includes a bundled FACEIT API key.
- `Settings > Integrations > FACEIT API key override` is optional.
- Only add your own key if you want to override the bundled quota.

### FACEIT account

Open `Settings > Downloads > FACEIT` and add your FACEIT account.

Recommendations:

- Use the exact FACEIT nickname from your profile.
- If you add multiple accounts, make sure the correct one is selected as current.

## FACEIT Scouting Workflow

1. Open `Downloads > FACEIT Scouting`.
2. Paste a FACEIT room URL or match ID.
3. Start scouting.
4. Let the app discover opponent samples on the same map.
5. Follow the provided match links when needed.
6. Download the demo and leave it in the configured download folder.
7. Wait for the app to process the file and refresh the scouting session.

Expected behavior:

- The demo is detected automatically.
- Supported archives are unpacked automatically.
- The demo is analyzed and imported.
- Tactics positions are generated.
- Scouting tactics become available without manual re-import.

Supported input formats include:

- `.dem`
- `.dem.gz`
- `.dem.bz2`
- `.dem.zip`
- `.dem.zst`

## 5EPlay Setup

Open `Settings > Downloads > 5EPlay`.

What to do:

- Click `Add 5EPlay account`.
- Enter your numeric `5EPlay ID`, not your nickname.
- You can find the ID at the end of your profile URL.
- Example: if your profile URL is `https://arena.5eplay.com/data/player/111111`, the ID is `111111`.
- If you add multiple accounts, make sure the correct one is selected as current.

Recommended checks:

- 5EPlay auto-download switches are now off by default.
- Enable them manually if you specifically want to test startup/background downloads.
- Confirm the current account switches correctly after restart.

## 5EPlay Recent Matches Workflow

1. Open `Downloads > 5EPlay`.
2. Refresh the recent matches for the current account.
3. Select a match from the sidebar.
4. Verify the scoreboard and match details load correctly.
5. Use `Download`, `Download all`, or copy/open the demo link when available.
6. Confirm the downloaded demo appears in the configured download folder.
7. Verify `See demo`, `Watch demo`, and other demo actions become available after processing.

Expected behavior:

- Recent matches load for the selected account.
- Switching the current account refreshes the list correctly.
- Individual and bulk demo downloads queue correctly.
- Imported 5EPlay demos become available for normal analysis and playback flows.

## 5EPlay Scouting Workflow

1. Open `Downloads > 5EPlay Scouting`.
2. Paste a 5EPlay room URL or match ID.
3. Start the scouting session.
4. Let the app discover same-map opponent samples and process the related demos automatically.
5. Review the generated tactics heatmaps with side, economy, radar level, and time-window filters.
6. If the app reports skipped imported demos without positions, run `Generate tactics positions for imported demos`.
7. Delete the scouting session and confirm the temporary scouting data is cleaned up.

Expected behavior:

- A current 5EPlay account is required and shown in the scouting panel.
- Targets move from waiting/downloading/processing to ready without manual database edits.
- Ready targets feed tactics automatically once demo processing finishes.
- The scouting session can be refreshed and deleted cleanly.

## Team Tactics Workflow

1. Open a processed match.
2. Go to the tactics views.
3. Switch between `Pistol`, `Eco`, `Semi`, `ForceBuy`, and `Full`.
4. Verify positions load on both team and scouting-related tactics pages.

Things to check:

- Heatmaps appear for the expected side and round filters.
- Windowed tactics positions load quickly.
- Missing positions can be regenerated instead of staying empty forever.

## Perfect World Setup

Open the Perfect World area from the downloads and account settings flows.

You can use either of these paths:

- Import the account from the local Perfect World client.
- Sign in with mobile number and SMS verification.

After account setup, verify:

- Account validation succeeds.
- Recent matches load.
- The correct account can be selected as current.

## Perfect World Scouting Workflow

1. Open the Perfect World scouting flow.
2. Choose or load a recent match.
3. Start a scouting session.
4. Let the app fetch targets, process demos, and generate tactics.
5. Review the produced tactics pages.
6. Delete the scouting session and confirm temporary imported data is cleaned up.

Expected behavior:

- Imported account stays available after restart.
- Recent matches refresh correctly.
- Scouting targets load without manual database edits.
- Demo processing feeds the tactics views automatically.

## Troubleshooting

### The app says PostgreSQL or `psql` is missing

- Make sure PostgreSQL is installed.
- Make sure `psql --version` works in a fresh terminal window.
- Restart Windows Terminal or Command Prompt after installing PostgreSQL.

### The database connection keeps failing

- Confirm the PostgreSQL service is running.
- Confirm the username, password, host, port, and database values.
- If you changed defaults, update the fields in the connection screen.

### FACEIT account can be added but scouting stays empty

- Confirm the correct FACEIT account is set as current.
- Confirm the source match has enough same-map sample history.
- Try another room URL or match ID.

### FACEIT demo downloads are not imported

- Confirm the download folder is correct.
- Confirm your browser or download flow saves files into that folder.
- Keep the app open until processing finishes.

### 5EPlay account cannot be added

- Make sure you entered the numeric `5EPlay ID`, not the nickname.
- Open your 5EPlay profile page and copy the last URL segment.
- If the account already exists, switch the current account instead of adding it again.

### 5EPlay recent matches stay empty

- Confirm the correct 5EPlay account is set as current.
- Click refresh again after switching accounts.
- Some matches may not expose a demo download; try another recent match if needed.

### 5EPlay scouting stays on waiting or processing

- Keep the app open while the scouting session downloads and analyzes demos.
- Confirm the configured download folder is writable and still selected.
- Try another 5EPlay room URL or match ID if the current one has no usable same-map samples.

### Perfect World import or SMS login fails

- Retry with the current account selected.
- Check whether the local Perfect World client is installed for import mode.
- If SMS verification expires, request a new code and retry.

### Tactics pages stay empty

- Wait for demo analysis and position generation to finish.
- Reopen the scouting or match page after processing.
- Try a different economy filter to confirm data exists.

## Feedback Template

When reporting feedback, please include:

- Windows version
- Whether you used `Setup` or `Portable`
- PostgreSQL version
- Whether `psql --version` worked before launch
- Which workflow you tested: `FACEIT`, `5EPlay`, `5EPlay Scouting`, `Team Tactics`, `Perfect World`
- Match URL / match ID if the problem is reproducible
- What you expected
- What actually happened
- Screenshots or logs if available

## Acknowledgement

CS Analyzer is based on the open-source [cs-demo-manager](https://github.com/akiver/cs-demo-manager) project by AkiVer.
The original MIT license notice is preserved in this repository in accordance with the upstream license.

## GitHub Links

- Releases: <https://github.com/surelykidding/cs-analyzer/releases>
- Issues / Feedback: <https://github.com/surelykidding/cs-analyzer/issues>

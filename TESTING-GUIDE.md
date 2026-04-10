# Private Testing Guide

This branch is for private testing of the current FACEIT scouting and tactics workflow.

Important:

- Use the zip package provided by the maintainer.
- Do not use GitHub's "Download ZIP" from the repository page for this test build.
- The maintainer package includes the locally rebuilt `static/csda.exe` needed by the new tactics position workflow.

## What Is In This Test Build

- FACEIT scouting page with browser-assisted downloads
- Team tactics and FACEIT scouting tactics
- Economy type filters: `Pistol`, `Eco`, `Semi`, `ForceBuy`, `Full`
- Windowed tactics positions
- CT HE grenade heatmap
- CT AWP holder heatmap

## Required Software

Install these before starting:

- Node.js `24.x`
- npm `11.x` or newer
- PostgreSQL
- `psql` must be available in your `PATH`

You can install PostgreSQL locally, or run it with Docker.

## PostgreSQL Setup

### Option A: Local PostgreSQL

Create a PostgreSQL user and database with these test values:

- Host: `127.0.0.1`
- Port: `5432`
- Username: `postgres`
- Password: `password`
- Database: `csdm`

These values match the application's default database settings.

### Option B: Docker

From [`docker/.env.example`](/D:/open/cs-demo-manager/docker/.env.example), create a local `.env` file inside the [`docker`](/D:/open/cs-demo-manager/docker) folder with:

```env
POSTGRES_DB=csdm
POSTGRES_PASSWORD=password
POSTGRES_PORT=5432
```

Then start PostgreSQL:

```bash
cd docker
docker compose up -d
```

Note:

- The app checks for `psql --version` on startup.
- Even if PostgreSQL itself runs in Docker, having the PostgreSQL client tools installed on Windows is still the safest setup for this test.

## Start The App

This guide assumes you received the maintainer's source zip package.

1. Extract the zip.
2. Open a terminal in the project root.
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

On first startup, the app will try to:

- connect to PostgreSQL
- create the `csdm` database if needed
- run migrations automatically

## First Settings To Configure

### 1. FACEIT API key

Open:

- `Settings > Integrations > FACEIT API key`

Paste the FACEIT Data API key provided privately by the maintainer.

This key is not stored in this repository on purpose.

### 2. FACEIT account

Open:

- `Settings > Downloads > FACEIT`

Add your FACEIT nickname exactly as it appears in your FACEIT profile URL.

Important:

- The nickname is case-sensitive.
- After adding multiple accounts, make sure the correct one is selected as the current FACEIT account.

### 3. Download folder

Open:

- `Settings > Downloads > Download folder`

Set this to the exact folder where your browser saves FACEIT demos.

This folder is also the folder monitored by FACEIT scouting.

Recommendations:

- Set this before starting a scouting session.
- Use a dedicated folder for this test if possible.
- Do not manually rename downloaded FACEIT demo files.

## FACEIT Scouting Test Flow

1. Open `Downloads > FACEIT Scouting`.
2. Paste a FACEIT room URL or match ID.
3. Start scouting.
4. The app will discover opponent samples on the same map.
5. Use the provided FACEIT links to open matches in your browser.
6. Download the demo from FACEIT in your browser.
7. Leave the downloaded file in the monitored download folder.
8. The app should automatically:
   - detect the new file
   - unpack supported archives
   - analyze the demo
   - import it into the database
   - generate tactics positions
   - show tactics on the scouting page

Supported archive handling in this test build includes:

- `.dem`
- `.dem.gz`
- `.dem.bz2`
- `.dem.zip`
- `.dem.zst`

## Tactics Notes

- Tactics no longer depend on full match position generation.
- Tactics positions are windowed and optimized for faster analysis.
- Economy filters are available in both Team Tactics and FACEIT Scouting Tactics.
- CT view includes:
  - `CT Heatmap`
  - `HE Grenades`
  - `AWP Holder Heatmap`

## Current Test Defaults

- Database password: `password`
- Database name: `csdm`
- Database host: `127.0.0.1`
- Database port: `5432`
- Tactics positions concurrency is configurable from:
  - `Settings > Analyze > Maximum number of concurrent tactics position generations`

## Troubleshooting

### App says PostgreSQL or psql is missing

- Make sure PostgreSQL is installed.
- Make sure `psql` works in a fresh terminal:

```bash
psql --version
```

### FACEIT scouting finds matches but nothing imports

- Confirm the download folder is correct.
- Confirm your browser is saving the demo into that folder.
- Do not rename the downloaded file.
- Keep the app open while downloading.

### FACEIT scouting stays empty

- Confirm the FACEIT API key is set.
- Confirm the current FACEIT account is the one that actually played the source match.
- Confirm the source room has same-map opponent history available.

### Delete scouting session is unavailable

- Wait for active processing to finish.
- If a target is stuck because of an interrupted run, restart the app and try deletion again.

## What Testers Should Report

Please report:

- Whether PostgreSQL setup was smooth
- Whether FACEIT scouting found opponent samples
- Whether browser-downloaded demos were detected automatically
- Whether `.dem.zst` files imported correctly
- Whether tactics pages loaded expected heatmaps
- Whether deleting the scouting session removed the imported temporary data as expected

import fs from 'fs-extra';
import path from 'node:path';
import { Command } from './command';
import { probeFaceitDownloads } from 'csdm/node/faceit/probe-faceit-downloads';

export class ProbeFaceitDownloadsCommand extends Command {
  public static Name = 'probe-faceit-downloads';
  private currentAccountMatchCount = 5;
  private manualMatchIdsOrUrls: string[] = [];
  private reportPath: string | undefined;
  private latestFlag = '--latest';
  private matchFlag = '--match';
  private reportFlag = '--report';

  public getDescription() {
    return 'DEV ONLY: probe whether FACEIT demo URLs can still be downloaded and imported.';
  }

  public printHelp() {
    console.log(this.getDescription());
    console.log('');
    console.log(
      `Usage: csdm ${ProbeFaceitDownloadsCommand.Name} ${this.formatFlagsForHelp([
        this.latestFlag,
        this.matchFlag,
        this.reportFlag,
      ])}`,
    );
    console.log('');
    console.log(`The ${this.latestFlag} flag controls how many matches to probe from the current FACEIT account.`);
    console.log(`The ${this.matchFlag} flag can be repeated and accepts either a FACEIT match id or a room URL.`);
    console.log(`The ${this.reportFlag} flag writes the JSON report to a file in addition to stdout.`);
    console.log('');
    console.log('Examples:');
    console.log('');
    console.log(`    csdm ${ProbeFaceitDownloadsCommand.Name}`);
    console.log(
      `    csdm ${ProbeFaceitDownloadsCommand.Name} ${this.latestFlag} 3 ${this.matchFlag} "1-df68bd34-a892-4a38-8f09-fb284e2a86c4"`,
    );
    console.log(
      `    csdm ${ProbeFaceitDownloadsCommand.Name} ${this.latestFlag} 0 ${this.matchFlag} "https://www.faceit.com/en/cs2/room/1-df68bd34-a892-4a38-8f09-fb284e2a86c4" ${this.reportFlag} "C:\\\\temp\\\\faceit-probe.json"`,
    );
  }

  public async run() {
    this.parseArgs(this.args);

    const report = await probeFaceitDownloads({
      currentAccountMatchCount: this.currentAccountMatchCount,
      manualMatchIdsOrUrls: this.manualMatchIdsOrUrls,
      onProgress: (message) => {
        console.log(message);
      },
    });

    if (this.reportPath !== undefined) {
      const reportDirectoryPath = path.dirname(this.reportPath);
      await fs.ensureDir(reportDirectoryPath);
      await fs.writeFile(this.reportPath, JSON.stringify(report, null, 2));
      console.log(`Report written to ${this.reportPath}`);
    }

    console.log(JSON.stringify(report, null, 2));
  }

  protected parseArgs(args: string[]) {
    super.parseArgs(args);

    for (let index = 0; index < args.length; index++) {
      const arg = args[index];
      if (!this.isFlagArgument(arg)) {
        console.log(`Unknown argument: ${arg}`);
        this.exitWithFailure();
      }

      switch (arg) {
        case this.latestFlag: {
          if (args.length <= index + 1) {
            console.log(`Missing ${this.latestFlag} value`);
            this.exitWithFailure();
          }

          index += 1;
          const value = Number.parseInt(args[index], 10);
          if (!Number.isInteger(value) || value < 0) {
            console.log(`Invalid ${this.latestFlag} value`);
            this.exitWithFailure();
          }

          this.currentAccountMatchCount = value;
          break;
        }
        case this.matchFlag: {
          if (args.length <= index + 1) {
            console.log(`Missing ${this.matchFlag} value`);
            this.exitWithFailure();
          }

          index += 1;
          this.manualMatchIdsOrUrls.push(args[index]);
          break;
        }
        case this.reportFlag: {
          if (args.length <= index + 1) {
            console.log(`Missing ${this.reportFlag} value`);
            this.exitWithFailure();
          }

          index += 1;
          this.reportPath = args[index];
          break;
        }
        default:
          console.log(`Unknown flag: ${arg}`);
          this.exitWithFailure();
      }
    }

    if (this.currentAccountMatchCount === 0 && this.manualMatchIdsOrUrls.length === 0) {
      console.log('No FACEIT matches to probe.');
      this.exitWithFailure();
    }
  }
}

package cli

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/akiver/cs-demo-analyzer/pkg/api"
	"github.com/akiver/cs-demo-analyzer/pkg/api/constants"
)

type cliArgs struct {
	demoPath                   string
	includePositions           bool
	source                     string
	outputPath                 string
	format                     string
	minifyJSON                 bool
	rounds                     string
	positionEntities           string
	positionWindowStartSeconds int
	positionWindowEndSeconds   int
}

func (cli *cliArgs) validateArgs() error {
	if cli.demoPath == "" {
		return errors.New("demo file path required, example: -demo-path path/to/demo.dem")
	}

	if cli.outputPath == "" {
		return errors.New("output path required, example: -output ./output")
	}

	if cli.format != "" {
		err := api.ValidateExportFormat(constants.ExportFormat(cli.format))
		if err != nil {
			return err
		}
	}

	if cli.source != "" {
		err := api.ValidateDemoSource(constants.DemoSource(cli.source))
		if err != nil {
			return err
		}
	}

	if _, err := cli.getRoundNumbers(); err != nil {
		return err
	}

	if _, err := cli.getPositionEntities(); err != nil {
		return err
	}

	if err := api.ValidatePositionWindowSeconds(cli.positionWindowStartSeconds, cli.positionWindowEndSeconds); err != nil {
		return err
	}

	return nil
}

func (cli *cliArgs) getRoundNumbers() ([]int, error) {
	if cli.rounds == "" {
		return nil, nil
	}

	parts := strings.Split(cli.rounds, ",")
	roundNumbers := make([]int, 0, len(parts))
	for _, part := range parts {
		trimmedValue := strings.TrimSpace(part)
		if trimmedValue == "" {
			continue
		}

		roundNumber, err := strconv.Atoi(trimmedValue)
		if err != nil {
			return nil, fmt.Errorf("invalid round number %q", trimmedValue)
		}

		if roundNumber <= 0 {
			return nil, fmt.Errorf("round number must be greater than 0, got %d", roundNumber)
		}

		roundNumbers = append(roundNumbers, roundNumber)
	}

	if len(roundNumbers) == 0 {
		return nil, errors.New("at least one valid round number must be provided when using -rounds")
	}

	return roundNumbers, nil
}

func (cli *cliArgs) getPositionEntities() ([]string, error) {
	if cli.positionEntities == "" {
		return nil, nil
	}

	parts := strings.Split(cli.positionEntities, ",")
	entities := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmedValue := strings.TrimSpace(part)
		if trimmedValue == "" {
			continue
		}

		entities = append(entities, trimmedValue)
	}

	if len(entities) == 0 {
		return nil, errors.New("at least one valid entity must be provided when using -position-entities")
	}

	if err := api.ValidatePositionEntities(entities); err != nil {
		return nil, err
	}

	return entities, nil
}

func (cli *cliArgs) fromArgs(args []string) error {
	fs := flag.NewFlagSet("csda", flag.ContinueOnError)
	fs.StringVar(&cli.demoPath, "demo-path", "", "Demo file path (mandatory)")
	fs.StringVar(&cli.outputPath, "output", "", "Output folder or file path, must be a folder when exporting to CSV (mandatory)")
	fs.StringVar(&cli.format, "format", "csv", "Export format, valid values: "+api.FormatValidExportFormats())
	fs.StringVar(&cli.source, "source", "", "Force demo's source, valid values: "+api.FormatValidDemoSources())
	fs.BoolVar(&cli.includePositions, "positions", false, "Include entities (players, grenades...) positions (default false)")
	fs.BoolVar(&cli.minifyJSON, "minify", false, "Minify JSON file, it has effect only when -format is set to json")
	fs.StringVar(&cli.rounds, "rounds", "", "Comma-separated round numbers to export, example: 1,13")
	fs.StringVar(&cli.positionEntities, "position-entities", "", "Comma-separated position entity types to export, valid values: "+api.FormatValidPositionEntities())
	fs.IntVar(&cli.positionWindowStartSeconds, "position-window-start-seconds", 0, "Only export positions captured at or after this many seconds after freeze time end")
	fs.IntVar(&cli.positionWindowEndSeconds, "position-window-end-seconds", 0, "Only export positions captured before this many seconds after freeze time end")

	if err := fs.Parse(args); err != nil {
		return err
	}

	if err := cli.validateArgs(); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		fs.Usage()
		return err
	}

	return nil
}

func Run(args []string) int {
	var cli cliArgs
	err := cli.fromArgs(args)
	if err != nil {
		return 2
	}

	roundNumbers, err := cli.getRoundNumbers()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return 2
	}

	positionEntities, err := cli.getPositionEntities()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return 2
	}

	err = api.AnalyzeAndExportDemo(cli.demoPath, cli.outputPath, api.AnalyzeAndExportDemoOptions{
		IncludePositions:           cli.includePositions,
		Source:                     constants.DemoSource(cli.source),
		Format:                     constants.ExportFormat(cli.format),
		MinifyJSON:                 cli.minifyJSON,
		RoundNumbers:               roundNumbers,
		PositionEntities:           positionEntities,
		PositionWindowStartSeconds: cli.positionWindowStartSeconds,
		PositionWindowEndSeconds:   cli.positionWindowEndSeconds,
	})

	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return 1
	}

	return 0
}

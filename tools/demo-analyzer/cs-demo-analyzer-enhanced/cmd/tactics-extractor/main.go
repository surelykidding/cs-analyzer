package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/akiver/cs-demo-analyzer/internal/converters"
	"github.com/akiver/cs-demo-analyzer/internal/csv"
	"github.com/akiver/cs-demo-analyzer/internal/slice"
	"github.com/akiver/cs-demo-analyzer/pkg/api"
	"github.com/akiver/cs-demo-analyzer/pkg/api/constants"
)

type cliArgs struct {
	demoPath                   string
	outputPath                 string
	source                     string
	rounds                     string
	positionWindowStartSeconds int
	positionWindowEndSeconds   int
}

func parseRoundNumbers(rounds string) ([]int, error) {
	if rounds == "" {
		return nil, nil
	}

	parts := strings.Split(rounds, ",")
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

func (args *cliArgs) fromArgs(rawArgs []string) error {
	fs := flag.NewFlagSet("csda-tactics-extractor", flag.ContinueOnError)
	fs.StringVar(&args.demoPath, "demo-path", "", "Demo file path (mandatory)")
	fs.StringVar(&args.outputPath, "output", "", "Output file path without suffix (mandatory)")
	fs.StringVar(&args.source, "source", "", "Force demo's source, valid values: "+api.FormatValidDemoSources())
	fs.StringVar(&args.rounds, "rounds", "", "Comma-separated round numbers to export, example: 1,13")
	fs.IntVar(&args.positionWindowStartSeconds, "position-window-start-seconds", 0, "Only export positions captured at or after this many seconds after freeze time end")
	fs.IntVar(&args.positionWindowEndSeconds, "position-window-end-seconds", 0, "Only export positions captured before this many seconds after freeze time end")

	if err := fs.Parse(rawArgs); err != nil {
		return err
	}

	if args.demoPath == "" {
		return errors.New("demo file path required, example: -demo-path path/to/demo.dem")
	}

	if args.outputPath == "" {
		return errors.New("output path required, example: -output ./output/demo")
	}

	if args.source != "" {
		if err := api.ValidateDemoSource(constants.DemoSource(args.source)); err != nil {
			return err
		}
	}

	if _, err := parseRoundNumbers(args.rounds); err != nil {
		return err
	}

	return api.ValidatePositionWindowSeconds(args.positionWindowStartSeconds, args.positionWindowEndSeconds)
}

func writePlayerPositions(match *api.Match, outputPath string) {
	lines := make([][]string, 0, len(match.PlayerPositions))
	for _, position := range match.PlayerPositions {
		lines = append(lines, []string{
			converters.IntToString(position.Frame),
			converters.IntToString(position.Tick),
			converters.BoolToString(position.IsAlive),
			converters.Float64ToString(position.X),
			converters.Float64ToString(position.Y),
			converters.Float64ToString(position.Z),
			converters.Float32ToString(position.Yaw),
			converters.Float64ToString(position.FlashDurationRemaining),
			converters.TeamToString(position.Side),
			converters.IntToString(position.Money),
			converters.IntToString(position.Health),
			converters.IntToString(position.Armor),
			converters.BoolToString(position.HasHelmet),
			converters.BoolToString(position.HasBomb),
			converters.BoolToString(position.HasDefuseKit),
			converters.BoolToString(position.IsDucking),
			converters.BoolToString(position.IsAirborne),
			converters.BoolToString(position.IsScoping),
			converters.BoolToString(position.IsDefusing),
			converters.BoolToString(position.IsPlanting),
			converters.BoolToString(position.IsGrabbingHostage),
			position.ActiveWeaponName.String(),
			strings.Join(slice.ToStrings(position.Equipments), ","),
			strings.Join(slice.ToStrings(position.Grenades), ","),
			strings.Join(slice.ToStrings(position.Pistols), ","),
			strings.Join(slice.ToStrings(position.SMGs), ","),
			strings.Join(slice.ToStrings(position.Rifles), ","),
			strings.Join(slice.ToStrings(position.Heavy), ","),
			converters.Uint64ToString(position.SteamID64),
			position.Name,
			converters.IntToString(position.RoundNumber),
			match.Checksum,
		})
	}

	csv.WriteLinesIntoCsvFile(outputPath+"_positions.csv", lines)
}

func run(rawArgs []string) int {
	var args cliArgs
	if err := args.fromArgs(rawArgs); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return 2
	}

	roundNumbers, err := parseRoundNumbers(args.rounds)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return 2
	}

	match, err := api.AnalyzeDemo(args.demoPath, api.AnalyzeDemoOptions{
		IncludePositions:           true,
		Source:                     constants.DemoSource(args.source),
		RoundNumbers:               roundNumbers,
		PositionEntities:           []string{"players"},
		PositionWindowStartSeconds: args.positionWindowStartSeconds,
		PositionWindowEndSeconds:   args.positionWindowEndSeconds,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return 1
	}

	writePlayerPositions(match, args.outputPath)

	return 0
}

func main() {
	os.Exit(run(os.Args[1:]))
}

package main

import (
	"os"

	"github.com/GoatWhistle/timeline/internal/cli"
)

func main() {
	os.Exit(cli.Execute())
}

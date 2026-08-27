package main

import (
	"os"

	"github.com/kaifarikman/hackathon-os-backend/internal/cli"
)

func main() {
	os.Exit(cli.Execute())
}

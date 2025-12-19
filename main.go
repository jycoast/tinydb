package main

import (
	"embed"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"log"
	"tinydb/app/bridge"
)

//go:embed frontend/dist
var assets embed.FS

func main() {
	app := bridge.NewApp()
	bridge.Application = app

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "tinydb",
		Width:  1024,
		Height: 768,
		// Use a custom (frontend-rendered) titlebar so we can force a pure white background on Windows.
		Frameless:       true,
		CSSDragProperty: "--wails-draggable",
		CSSDragValue:    "drag",
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Windows:          &windows.Options{Theme: windows.Light},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		LogLevel:         logger.DEBUG,
		OnStartup:        app.Startup,
		OnDomReady:       app.DomReady,
		OnShutdown:       app.Shutdown,
		OnBeforeClose:    app.OnBeforeClose,
		Bind: []interface{}{
			app,
			app.Connections,
			app.DatabaseConnections,
			app.ServerConnections,
			app.Plugins,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}

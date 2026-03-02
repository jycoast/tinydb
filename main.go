package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"

	"github.com/wailsapp/wails/v3/pkg/application"
	"tinydb/app/bridge"
)

//go:embed all:frontend/dist
var assets embed.FS

func windowsWindowOptions() application.WebviewWindowOptions {
	return application.WebviewWindowOptions{
		Title:     "tinydb",
		Width:     1024,
		Height:    768,
		Frameless: true,
	}
}

func mustSubFS(f fs.FS, dir string) fs.FS {
	sub, err := fs.Sub(f, dir)
	if err != nil {
		log.Fatal(err)
	}
	return sub
}

func main() {
	assetFS := mustSubFS(assets, "frontend/dist")
	app := application.New(application.Options{
		Name: "tinydb",
		Assets: application.AssetOptions{
			Handler: http.FileServer(http.FS(assetFS)),
		},
		Services: []application.Service{},
	})

	app.RegisterService(application.NewService(bridge.NewAppService(app)))
	app.RegisterService(application.NewService(bridge.NewConnectionsService(app)))
	app.RegisterService(application.NewService(bridge.NewDatabaseConnectionsService(app)))
	app.RegisterService(application.NewService(bridge.NewServerConnectionsService(app)))
	app.RegisterService(application.NewService(bridge.NewPluginsService(app)))
	app.RegisterService(application.NewService(bridge.NewConfigsService(app)))

	_ = app.Window.NewWithOptions(windowsWindowOptions())

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

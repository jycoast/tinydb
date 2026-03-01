package main

import (
	"embed"
	"io/fs"
	"log"
	"runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"tinydb/app/bridge"
)

//go:embed all:frontend/dist
var assets embed.FS

func windowsOptions() *windows.Options {
	opts := &windows.Options{Theme: windows.Light}
	if runtime.GOOS == "windows" {
		opts.WebviewIsTransparent = true
		opts.WindowIsTranslucent = true
	}
	return opts
}

func mustSubFS(f fs.FS, dir string) fs.FS {
	sub, err := fs.Sub(f, dir)
	if err != nil {
		log.Fatal(err)
	}
	return sub
}

func main() {
	app := bridge.NewApp()
	bridge.Application = app

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "tinydb",
		Width:  1024,
		Height: 768,
		// 无边框 + CSS 拖拽（参考常见 Wails 方案：内联 --wails-draggable，Windows 下透明以正确命中拖动区域）
		Frameless:       true,
		CSSDragProperty: "--wails-draggable",
		CSSDragValue:    "drag",
		AssetServer: &assetserver.Options{
			Assets: mustSubFS(assets, "frontend/dist"),
		},
		Windows: windowsOptions(),
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

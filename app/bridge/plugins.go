package bridge

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"tinydb/app/db/adapter/mongo"
	"tinydb/app/db/adapter/mysql"
	"tinydb/app/pkg/serializer"
)

type PluginsService struct {
	app *application.App
}

func NewPluginsService(app *application.App) *PluginsService {
	return &PluginsService{app: app}
}

func (p *PluginsService) Installed() *serializer.Response {
	return serializer.SuccessData(serializer.SUCCESS, []map[string]string{
		{"name": mongo.Adapter},
		{"name": mysql.Adapter},
	})
}

type ScriptRequest struct {
	PackageName string `json:"packageName"`
}

func (p *PluginsService) Script(req *ScriptRequest) *serializer.Response {
	module := make(chan interface{}, 1)
	p.app.Event.Emit("pullEventPluginsScript", req.PackageName)
	cancel := p.app.Event.On("loadPlugins", func(e *application.CustomEvent) {
		var payload interface{}
		if e != nil && e.Data != nil {
			payload = e.Data
		}
		select {
		case module <- payload:
		default:
		}
	})
	result := <-module
	cancel()
	return serializer.SuccessData(serializer.SUCCESS, result)
}

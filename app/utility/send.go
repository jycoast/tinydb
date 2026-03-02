package utility

import (
	"github.com/wailsapp/wails/v3/pkg/application"
)

func EmitChanged(key string) {
	app := application.Get()
	if app != nil && app.Event != nil {
		app.Event.Emit("changed-cache", key)
		app.Event.Emit(key)
	}
}

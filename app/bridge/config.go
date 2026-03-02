package bridge

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"tinydb/app/pkg/serializer"
)

type Configs struct {
}

func NewConfigsService(_ *application.App) *Configs {
	return &Configs{}
}

type Settings struct {
	UseNativeMenu bool `json:"useNativeMenu"`
}

func (cfg *Configs) GetSettings() *serializer.Response {
	return serializer.SuccessData(serializer.SUCCESS, map[string]interface{}{
		"app": &Settings{},
	})
}

func loadSettings() {

}

func fillMissingSettings() {

}

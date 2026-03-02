package bridge

import (
	"context"
	"fmt"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
	"tinydb/app/db/stash"
	"tinydb/app/pkg/logger"
)

var applicationOnce sync.Once

type AppService struct {
	app *application.App
}

func NewAppService(app *application.App) *AppService {
	return &AppService{app: app}
}

func (a *AppService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	logger.Infof("%s", fmt.Sprintf("tinydb app startup"))
	a.app.Event.On("common:WindowClosing", func(_ *application.CustomEvent) {
		stash.GetStorageSession().Clear()
	})
	return nil
}

func (a *AppService) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

package adapter

import (
	"errors"
	"github.com/samber/lo"
	"path/filepath"
	"tinydb/app/db"
	"tinydb/app/db/adapter/mongo"
	"tinydb/app/db/adapter/mysql"
	"tinydb/app/internal"
	"tinydb/app/pkg/logger"
	"tinydb/app/utility"
)

const (
	driverName = `engine`
	uuid       = `_id`
)

type sessionWithContext struct {
}

type Driver interface {
	//visit simple drive connection
	Open(map[string]interface{}) (db.Session, error)
}

func NewCompatDriver() Driver {
	return &sessionWithContext{}
}

func (s *sessionWithContext) Open(storedConnection map[string]interface{}) (db.Session, error) {
	// Only check for connections file if we're loading a saved connection (has _id)
	// For new connections being tested, the file may not exist yet
	if storedConnection[uuid] != nil && storedConnection[uuid].(string) != "" {
		if !utility.IsExist(filepath.Join(utility.DataDir(), "connections.jsonl")) {
			return nil, errors.New("connections file missing")
		}
	}
	return createSession(internal.DecryptConnection(loadConnection(storedConnection)))
}

func loadConnection(storedConnection map[string]interface{}) map[string]interface{} {
	if storedConnection[uuid] != nil && storedConnection[uuid].(string) != "" {
		loaded := internal.GetCore(storedConnection[uuid].(string), false)
		return lo.Assign(loaded, storedConnection)
	}

	return storedConnection
}

func createSession(storedConnection map[string]interface{}) (db.Session, error) {
	if storedConnection != nil && storedConnection[driverName].(string) != "" {
		switch storedConnection[driverName] {
		case mysql.Adapter:
			parseSetting, err := mysql.ParseSetting(storedConnection)
			if err != nil {
				logger.Errorf("setting parse failed %v", err)
				return nil, err
			}
			return mysql.Open(parseSetting)
		case mongo.Adapter:
			parseSetting, err := mongo.ParseSetting(storedConnection)
			if err != nil {
				logger.Errorf("setting parse failed %v", err)
				return nil, err
			}
			return mongo.Open(parseSetting)
		}
	}
	return nil, db.ErrMissingDriverName
}

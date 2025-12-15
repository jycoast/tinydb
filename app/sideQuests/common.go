package sideQuests

import (
	"tinydb/app/db"
	"tinydb/app/db/standard/modules"
)

func readVersion(driver db.Session) (*modules.Version, error) {
	version, err := driver.Version()
	if err != nil {
		return nil, err
	}

	return version, nil
}

package mysql

import (
	"fmt"
	"regexp"
	"tinydb/app/db"
	"tinydb/app/db/standard/modules"
	"tinydb/app/pkg/logger"
)

func (s *Source) Dialect() string {
	return Adapter
}

func (s *Source) Ping() error {
	if s.sqlDB != nil {
		database, err := s.sqlDB.DB()
		if err != nil {
			return err
		}
		return database.Ping()
	}
	return db.ErrNotConnected
}

func (s *Source) Version() (*modules.Version, error) {
	var rows []string
	err := s.sqlDB.Raw("select version()").Scan(&rows).Error
	if err != nil {
		logger.Errorf("get mysql version failed: %v", err)
		return nil, err
	}

	if len(rows) > 0 && rows[0] != "" {
		subMath := regexp.MustCompile("(.*)-MariaDB-").FindAllSubmatch([]byte(rows[0]), -1)
		if len(subMath) >= 1 {
			return &modules.Version{
				Version:     rows[0],
				VersionText: fmt.Sprintf("MariaDB %s", subMath[0]),
			}, nil
		}
	}

	return &modules.Version{
		Version:     rows[0],
		VersionText: fmt.Sprintf("MySQL %s", rows[0]),
	}, nil
}

func (s *Source) Close() error {
	defer func() {
		s.sqlDBMu.Lock()
		s.sqlDB = nil
		s.sqlDBMu.Unlock()
	}()
	if s.sqlDB == nil {
		return nil
	}
	database, err := s.sqlDB.DB()
	if err != nil {
		return nil
	}
	return database.Close()
}

func (s *Source) ListDatabases() (interface{}, error) {
	if s.sqlDB != nil {
		var rows []string
		err := s.sqlDB.Raw("SHOW DATABASES").Scan(&rows).Error
		if err != nil {
			logger.Errorf("get mysql lastDatabases failed: %v", err)
			return nil, err
		}
		return transformMysqlDatabases(rows), nil
	}

	return nil, db.ErrNotConnected
}

func (s *Source) Query(sql string) (interface{}, error) {
	// Protect the app from returning huge result sets (Wails marshalling + UI rendering can hang).
	const maxRows = 2000

	resultRows := make([]map[string]interface{}, 0, 64)
	sqlQuery, err := execute(s.sqlDB, sql)
	if err != nil {
		logger.Errorf("get mysql query failed: %v", err)
		return &modules.MysqlRowsResult{Rows: resultRows, Columns: []*modules.Column{}}, err
	}
	defer sqlQuery.Rows.Close()

	count := 0
	for sqlQuery.Rows.Next() {
		var row map[string]interface{}
		if err = s.sqlDB.ScanRows(sqlQuery.Rows, &row); err != nil {
			logger.Errorf("get mysql query row scanRows failed: %v", err)
			return &modules.MysqlRowsResult{Rows: make([]map[string]interface{}, 0), Columns: sqlQuery.Columns}, err
		}
		resultRows = append(resultRows, row)
		count++
		if count >= maxRows {
			break
		}
	}

	return &modules.MysqlRowsResult{
		Rows:    resultRows,
		Columns: sqlQuery.Columns,
	}, nil
}

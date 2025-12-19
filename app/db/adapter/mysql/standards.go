package mysql

import (
	"fmt"
	"regexp"
	"strings"
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

func (s *Source) CreateDatabase(name string) error {
	if s.sqlDB == nil {
		return db.ErrNotConnected
	}
	
	// Escape database name to prevent SQL injection
	// MySQL allows backticks for identifiers
	escapedName := fmt.Sprintf("`%s`", strings.ReplaceAll(name, "`", "``"))
	
	err := s.sqlDB.Exec(fmt.Sprintf("CREATE DATABASE %s", escapedName)).Error
	if err != nil {
		logger.Errorf("create mysql database failed: %v", err)
		return fmt.Errorf("failed to create database: %w", err)
	}
	
	return nil
}

func (s *Source) Query(sql string) (interface{}, error) {
	// Protect the app from returning huge result sets (Wails marshalling + UI rendering can hang).
	const maxRows = 2000

	// Validate SQL to prevent syntax errors from empty identifiers
	// Trim SQL to handle trailing whitespace/newlines
	sqlTrimmed := strings.TrimSpace(sql)

	// Check for empty identifier tokens like `` (backtick-backtick with nothing inside).
	// IMPORTANT: Do NOT treat escaped backticks inside a quoted identifier (e.g. `a``b`) as invalid.
	// We only flag "``" when it is followed by a delimiter/end (space, dot, comma, etc).
	isIdentDelimiter := func(b byte) bool {
		switch b {
		case ' ', '\t', '\n', '\r', '.', ',', ';', ')', ']', '}':
			return true
		default:
			return false
		}
	}
	findEmptyIdentTokenPos := func(s string) int {
		// look for "``" followed by a delimiter/end => empty identifier token: ``
		// NOTE: escaped backtick inside identifier looks like `a``b` (`` followed by 'b'), which we allow.
		for i := 0; i+1 < len(s); i++ {
			if s[i] == '`' && s[i+1] == '`' {
				if i+2 >= len(s) || isIdentDelimiter(s[i+2]) {
					return i
				}
			}
			// Also treat backtick + whitespace + backtick as empty/blank identifier: ` ` or `\t`
			if s[i] == '`' && i+2 < len(s) && (s[i+1] == ' ' || s[i+1] == '\t' || s[i+1] == '\n' || s[i+1] == '\r') && s[i+2] == '`' {
				return i
			}
		}
		return -1
	}
	if pos := findEmptyIdentTokenPos(sqlTrimmed); pos >= 0 {
		// include a short snippet for debugging in UI logs
		start := pos - 80
		if start < 0 {
			start = 0
		}
		end := pos + 160
		if end > len(sqlTrimmed) {
			end = len(sqlTrimmed)
		}
		snippet := sqlTrimmed[start:end]
		err := fmt.Errorf("invalid SQL: contains empty identifier (table or column name is empty) at pos=%d. context=%s", pos, snippet)
		logger.Errorf("get mysql query failed: %v", err)
		return &modules.MysqlRowsResult{Rows: make([]map[string]interface{}, 0), Columns: []*modules.Column{}}, err
	}

	// Check for FROM followed by empty backticks in the middle of SQL
	fromEmptyPattern := regexp.MustCompile(`(?i)\bFROM\s+` + "``")
	if fromEmptyPattern.MatchString(sqlTrimmed) {
		err := fmt.Errorf("invalid SQL: FROM clause contains empty table name")
		logger.Errorf("get mysql query failed: %v", err)
		return &modules.MysqlRowsResult{Rows: make([]map[string]interface{}, 0), Columns: []*modules.Column{}}, err
	}

	// Check for incomplete FROM clauses - FROM followed by single backtick (not closed)
	// This catches cases like "SELECT * FROM `" where the backtick is not closed
	// Use a simpler approach: check if SQL ends with "`" and contains "FROM" before it
	if strings.HasSuffix(sqlTrimmed, "`") {
		// Check if there's a FROM clause before the trailing backtick
		fromIndex := strings.LastIndex(strings.ToUpper(sqlTrimmed), "FROM")
		if fromIndex >= 0 {
			// Extract the part after FROM
			afterFrom := strings.TrimSpace(sqlTrimmed[fromIndex+4:])
			// If it's just a backtick or backtick with whitespace, it's invalid
			if afterFrom == "`" || strings.HasPrefix(afterFrom, "`") && len(strings.TrimSpace(afterFrom)) <= 1 {
				err := fmt.Errorf("invalid SQL: incomplete FROM clause (table name is missing, only backtick found)")
				logger.Errorf("get mysql query failed: %v", err)
				return &modules.MysqlRowsResult{Rows: make([]map[string]interface{}, 0), Columns: []*modules.Column{}}, err
			}
		}
	}

	// Also check for FROM ` followed by SQL keywords (not a valid table name)
	fromSingleBacktickPattern := regexp.MustCompile(`(?i)\bFROM\s+` + "`" + `\s+(?:WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP|ORDER|HAVING|LIMIT|;|$)`)
	if fromSingleBacktickPattern.MatchString(sqlTrimmed) {
		err := fmt.Errorf("invalid SQL: incomplete FROM clause (table name is missing, only backtick found)")
		logger.Errorf("get mysql query failed: %v", err)
		return &modules.MysqlRowsResult{Rows: make([]map[string]interface{}, 0), Columns: []*modules.Column{}}, err
	}

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

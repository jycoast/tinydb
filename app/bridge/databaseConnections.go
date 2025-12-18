package bridge

import (
	"fmt"
	"github.com/samber/lo"
	"strings"
	"sync"
	"tinydb/app/analyser"
	"tinydb/app/db/standard/modules"
	"tinydb/app/internal/schema"
	"tinydb/app/pkg/logger"
	"tinydb/app/pkg/serializer"
	"tinydb/app/sideQuests"
	"tinydb/app/utility"
)

const databaseKey = "database"

type DatabaseConnections struct {
	Opened             []*schema.OpenedDatabaseConnection
	Closed             map[string]*schema.DatabaseConnectionClosed
	DatabaseConnection *sideQuests.DatabaseConnection
}

func NewDatabaseConnections() *DatabaseConnections {
	return &DatabaseConnections{
		Closed:             make(map[string]*schema.DatabaseConnectionClosed),
		DatabaseConnection: sideQuests.NewDatabaseConnection(),
	}
}

func (dc *DatabaseConnections) handleStructure(conid, database string, structure map[string]interface{}) {
	existing := findByDatabaseConnection(dc.Opened, conid, database)

	if existing == nil {
		return
	}

	existing.Structure = structure
	utility.EmitChanged(Application.ctx, fmt.Sprintf("database-structure-changed-%s-%s", conid, database))
}

func (dc *DatabaseConnections) handleStructureTime(conid, database string, analysedTime utility.UnixTime) {
	existing := findByDatabaseConnection(dc.Opened, conid, database)

	if existing == nil {
		return
	}

	existing.AnalysedTime = analysedTime

	utility.EmitChanged(Application.ctx, fmt.Sprintf("database-status-changed-%s-%s", conid, database))
}

func (dc *DatabaseConnections) handleVersion(conid, database string, version *modules.Version) {
	existing := findByDatabaseConnection(dc.Opened, conid, database)
	if existing == nil {
		return
	}
	existing.ServerVersion = version
	utility.EmitChanged(Application.ctx, fmt.Sprintf("database-server-version-changed-%s-%s", conid, database))
}

func (dc *DatabaseConnections) handleError(conid, database string, err error) {
	logger.Errorf("Error in database connection [%s], database [%d]: [%v]", conid, database, err)
}

func (dc *DatabaseConnections) handleStatus(conid, database string, status *schema.OpenedStatus) {
	existing := findByDatabaseConnection(dc.Opened, conid, database)
	if existing == nil {
		return
	}
	if existing.Status != nil && status != nil && existing.Status.Counter > status.Counter {
		return
	}
	existing.Status = status
	utility.EmitChanged(Application.ctx, fmt.Sprintf("database-status-changed-%s-%s", conid, database))
}

func (dc *DatabaseConnections) handlePing() {

}

func (dc *DatabaseConnections) ensureOpened(conid, database string) *schema.OpenedDatabaseConnection {
	existing := findByDatabaseConnection(dc.Opened, conid, database)

	if existing != nil {
		return existing
	}

	connection := getCore(conid, false)
	if connection == nil {
		return nil
	}

	lastClosed := dc.Closed[fmt.Sprintf("%s/%s", conid, database)]

	newOpened := &schema.OpenedDatabaseConnection{
		Conid:         conid,
		Status:        &schema.OpenedStatus{Name: "pending"},
		Database:      database,
		Connection:    connection,
		ServerVersion: nil,
	}

	if lastClosed == nil || lastClosed.Structure == nil {
		newOpened.Structure = analyser.CreateEmptyStructure()
	}

	dc.Opened = append(dc.Opened, newOpened)

	var structure map[string]interface{}
	if lastClosed != nil && lastClosed.Structure == nil {
		structure = lastClosed.Structure
	} else {
		structure = nil
	}

	ch := make(chan *schema.EchoMessage)
	dc.DatabaseConnection.ResetVars()
	wg := sync.WaitGroup{}
	wg.Add(1)
	go dc.DatabaseConnection.Connect(ch, newOpened, structure)
	go func() {
		dc.receiver(ch, conid, database)
		wg.Done()
	}()
	wg.Wait()
	return newOpened
}

func (dc *DatabaseConnections) Refresh(req *DatabaseKeepOpenRequest) *serializer.Response {
	if !req.KeepOpen {
		dc.close(req.Conid, req.Database, true)
	}
	dc.ensureOpened(req.Conid, req.Database)
	return serializer.SuccessData(serializer.SUCCESS, map[string]string{"status": "ok"})
}

func (dc *DatabaseConnections) SyncModel(req *DatabaseRequest) *serializer.Response {
	dc.ensureOpened(req.Conid, req.Database)

	return serializer.SuccessData(serializer.SUCCESS, map[string]string{"status": "ok"})
}

type databaseConnections struct {
	Conid    string `json:"conid"`
	Database string `json:"database"`
}

type DatabaseRequest struct {
	databaseConnections
}

type DatabaseKeepOpenRequest struct {
	databaseConnections
	KeepOpen bool `json:"keepOpen"`
}

func (dc *DatabaseConnections) Ping(req *DatabaseRequest) *serializer.Response {
	if req == nil || req.Conid == "" {
		return serializer.Fail(serializer.IdNotEmpty)
	}

	existing := findByDatabaseConnection(dc.Opened, req.Conid, req.Database)

	if existing != nil {
		dc.DatabaseConnection.Ping()
	} else {
		existing = dc.ensureOpened(req.Conid, req.Database)
	}

	res := map[string]interface{}{"status": "ok"}
	if existing != nil {
		res["connectionStatus"] = existing.Status
	} else {
		res["connectionStatus"] = nil
	}
	return serializer.SuccessData(serializer.SUCCESS, res)
}

func (dc *DatabaseConnections) Structure(req *DatabaseRequest) *serializer.Response {
	if req.Conid == "__model" {
		//todo  const model = await importDbModel(database);
	}

	opened := dc.ensureOpened(req.Conid, req.Database)
	if opened != nil {
		return serializer.SuccessData(serializer.SUCCESS, opened.Structure)
	}
	return serializer.Fail(serializer.NilRecord)
}

func (dc *DatabaseConnections) receiver(chData <-chan *schema.EchoMessage, conid, database string) {
	for {
		message, ok := <-chData
		if message != nil {
			if message.Err != nil {
				if existing := findByDatabaseConnection(dc.Opened, conid, database); existing != nil && !existing.Disconnected {
					dc.close(conid, database, false)
				}
			}
			switch message.MsgType {
			case "status":
				dc.handleStatus(conid, database, message.Payload.(*schema.OpenedStatus))
			case "structure":
				dc.handleStructure(conid, database, message.Payload.(map[string]interface{}))
			case "structureTime":
				dc.handleStructureTime(conid, database, message.Payload.(utility.UnixTime))
			case "version":
				dc.handleVersion(conid, database, message.Payload.(*modules.Version))
			}
		}
		if !ok {
			break
		}
	}
}

func (dc *DatabaseConnections) ServerVersion(req *DatabaseRequest) *serializer.Response {
	if req == nil || req.Conid == "" {
		return serializer.Fail(serializer.ParamsErr)
	}

	opened := dc.ensureOpened(req.Conid, req.Database)
	if opened != nil && opened.ServerVersion != nil {
		return serializer.SuccessData(serializer.SUCCESS, opened.ServerVersion)
	}
	return serializer.SuccessData(serializer.SUCCESS, nil)
}

func (dc *DatabaseConnections) Status(req *DatabaseRequest) *serializer.Response {
	existing := findByDatabaseConnection(dc.Opened, req.Conid, req.Database)

	if existing != nil {
		return serializer.SuccessData(serializer.SUCCESS, map[string]interface{}{
			"name":         existing.Status.Name,
			"message":      existing.Status.Message,
			"counter":      existing.Status.Counter,
			"analysedTime": existing.AnalysedTime,
		})
	}

	lastClosed := dc.Closed[fmt.Sprintf("%s/%s", req.Conid, req.Database)]
	if lastClosed != nil {
		return serializer.SuccessData(serializer.SUCCESS, map[string]interface{}{
			"analysedTime": lastClosed.AnalysedTime,
		})
	}
	return serializer.SuccessData(serializer.SUCCESS, map[string]string{
		"name":    "error",
		"message": "Not connected",
	})
}

func (dc *DatabaseConnections) sendRequest(conn *schema.OpenedDatabaseConnection, message *schema.EchoMessage) (res *schema.EchoMessage) {
	if message == nil {
		return nil
	}

	switch message.MsgType {
	case "sqlSelect":
		res = dc.DatabaseConnection.HandleSqlSelect(Application.ctx, conn, message.Payload)
	case "collectionData":
		res = dc.DatabaseConnection.HandleCollectionData(conn, message.Payload.(*modules.CollectionDataOptions))
	default:
		res = nil
	}

	return res
}

type DatabaseKillRequest struct {
	databaseConnections
	Kill bool `json:"kill"`
}

func (dc *DatabaseConnections) close(conid, database string, kill bool) {
	existing := findByDatabaseConnection(dc.Opened, conid, database)
	if existing != nil {
		existing.Disconnected = true
		if kill {

		}
		dc.Opened = lo.Filter[*schema.OpenedDatabaseConnection](dc.Opened, func(item *schema.OpenedDatabaseConnection, _ int) bool {
			return item.Conid != conid || item.Database != database
		})

		dc.Closed[fmt.Sprintf("%s/%s", conid, database)] = &schema.DatabaseConnectionClosed{
			Structure:    existing.Structure,
			AnalysedTime: existing.AnalysedTime,
			Status: &schema.OpenedStatus{
				Name:    "error",
				Message: existing.Status.Message,
				Counter: existing.Status.Counter,
			},
		}

		utility.EmitChanged(Application.ctx, fmt.Sprintf("database-status-changed-%s-%s", conid, database))
	}
}

func (dc *DatabaseConnections) closeAll(conid string, kill bool) {
	list := lo.Filter[*schema.OpenedDatabaseConnection](dc.Opened, func(item *schema.OpenedDatabaseConnection, _ int) bool {
		return item.Conid == conid
	})

	for _, v := range list {
		dc.close(conid, v.Database, kill)
	}
}

func (dc *DatabaseConnections) Disconnect(req *DatabaseRequest) *serializer.Response {
	dc.close(req.Conid, req.Database, true)
	return serializer.SuccessData(serializer.SUCCESS, &schema.OpenedStatus{Name: "ok"})
}

func findByDatabaseConnection(s []*schema.OpenedDatabaseConnection, conid, database string) *schema.OpenedDatabaseConnection {
	existing, ok := lo.Find[*schema.OpenedDatabaseConnection](s, func(item *schema.OpenedDatabaseConnection) bool {
		return item != nil && item.Conid != "" && item.Conid == conid && item.Database != "" && item.Database == database
	})

	if existing != nil && ok {
		return existing
	}
	return nil
}

type SqlSelectRequest struct {
	databaseConnections
	Select interface{}
}

func (dc *DatabaseConnections) SqlSelect(req *SqlSelectRequest) *serializer.Response {
	opened := dc.ensureOpened(req.Conid, req.Database)
	if opened == nil {
		return serializer.SuccessData(serializer.SUCCESS, map[string]interface{}{"msgtype": "response"})
	}
	response := dc.sendRequest(opened, &schema.EchoMessage{Payload: req.Select, MsgType: "sqlSelect"})
	if response == nil {
		return serializer.Fail("Error executing SQL script")
	}

	if response.Err != nil {
		if existing := findByDatabaseConnection(dc.Opened, req.Conid, req.Database); existing != nil && !existing.Disconnected {
			dc.close(req.Conid, req.Database, false)
		}
		return serializer.Fail(response.Err.Error())
	}

	if response.Payload != nil {
		return serializer.SuccessData(serializer.SUCCESS, map[string]interface{}{
			"msgtype": response.MsgType,
			"rows":    response.Payload,
		})
	}

	return serializer.Fail(serializer.NilRecord)
}

type CollectionDataRequest struct {
	databaseConnections
	Options *modules.CollectionDataOptions
}

func (dc *DatabaseConnections) CollectionData(req *CollectionDataRequest) *serializer.Response {
	if req.Options == nil || req.Options.PureName == "" {
		return serializer.Fail("messing query params")
	}
	opened := dc.ensureOpened(req.Conid, req.Database)
	if opened == nil {
		logger.Error("load collection opened nil")
		return serializer.SuccessData(serializer.SUCCESS, map[string]interface{}{"msgtype": "response"})
	}

	response := dc.sendRequest(opened, &schema.EchoMessage{Payload: req.Options, MsgType: "collectionData"})
	if response == nil {
		logger.Error("get response nil")
		return serializer.Fail("Error executing SQL script")
	}

	if response.Err != nil {
		if existing := findByDatabaseConnection(dc.Opened, req.Conid, req.Database); existing != nil && !existing.Disconnected {
			dc.close(req.Conid, req.Database, false)
		}
		logger.Errorf("findByDatabaseConnection response failed %v", response.Err)
		return serializer.Fail(response.Err.Error())
	}

	if response.Payload != nil {
		return serializer.SuccessData(serializer.SUCCESS, response.Payload)
	}

	return serializer.Fail(serializer.NilRecord)
}

type CreateTableRequest struct {
	databaseConnections
	TableName string                   `json:"tableName"`
	Columns   []map[string]interface{} `json:"columns"`
}

func (dc *DatabaseConnections) CreateTable(req *CreateTableRequest) *serializer.Response {
	if req == nil || req.Conid == "" || req.Database == "" {
		return serializer.Fail(serializer.IdNotEmpty)
	}
	if req.TableName == "" {
		return serializer.Fail("table name is required")
	}
	if len(req.Columns) == 0 {
		return serializer.Fail("at least one column is required")
	}

	opened := dc.ensureOpened(req.Conid, req.Database)
	if opened == nil {
		return serializer.Fail("database connection not found")
	}

	// Build CREATE TABLE SQL
	sql := buildCreateTableSQL(req.TableName, req.Columns)

	// Execute the SQL
	response := dc.sendRequest(opened, &schema.EchoMessage{
		Payload: map[string]interface{}{"sql": sql},
		MsgType: "sqlSelect",
	})

	if response == nil {
		return serializer.Fail("Error executing CREATE TABLE statement")
	}

	if response.Err != nil {
		return serializer.Fail(fmt.Sprintf("failed to create table: %v", response.Err))
	}

	// Refresh database structure
	dc.ensureOpened(req.Conid, req.Database)

	return serializer.SuccessData(serializer.SUCCESS, map[string]string{
		"status":    "ok",
		"tableName": req.TableName,
	})
}

func buildCreateTableSQL(tableName string, columns []map[string]interface{}) string {
	var sql strings.Builder
	sql.WriteString(fmt.Sprintf("CREATE TABLE `%s` (\n", strings.ReplaceAll(tableName, "`", "``")))

	for i, col := range columns {
		if i > 0 {
			sql.WriteString(",\n")
		}
		colName := fmt.Sprintf("%v", col["columnName"])
		colType := fmt.Sprintf("%v", col["dataType"])
		colName = strings.ReplaceAll(colName, "`", "``")

		sql.WriteString(fmt.Sprintf("  `%s` %s", colName, colType))

		// Add length/precision if specified
		if charMaxLength, ok := col["charMaxLength"].(float64); ok && charMaxLength > 0 {
			sql.WriteString(fmt.Sprintf("(%d)", int(charMaxLength)))
		} else if numericPrecision, ok := col["numericPrecision"].(float64); ok && numericPrecision > 0 {
			if numericScale, ok := col["numericScale"].(float64); ok && numericScale > 0 {
				sql.WriteString(fmt.Sprintf("(%d,%d)", int(numericPrecision), int(numericScale)))
			} else {
				sql.WriteString(fmt.Sprintf("(%d)", int(numericPrecision)))
			}
		}

		// Add NOT NULL
		if isNullable, ok := col["isNullable"].(string); ok && isNullable == "NO" {
			sql.WriteString(" NOT NULL")
		}

		// Add AUTO_INCREMENT
		if extra, ok := col["extra"].(string); ok && strings.Contains(extra, "auto_increment") {
			sql.WriteString(" AUTO_INCREMENT")
		}

		// Add DEFAULT value
		if defaultValue, ok := col["defaultValue"]; ok && defaultValue != nil && defaultValue != "" {
			defVal := fmt.Sprintf("%v", defaultValue)
			if colType == "VARCHAR" || colType == "TEXT" || colType == "CHAR" {
				sql.WriteString(fmt.Sprintf(" DEFAULT '%s'", strings.ReplaceAll(defVal, "'", "''")))
			} else {
				sql.WriteString(fmt.Sprintf(" DEFAULT %s", defVal))
			}
		}

		// Add COMMENT
		if comment, ok := col["columnComment"].(string); ok && comment != "" {
			sql.WriteString(fmt.Sprintf(" COMMENT '%s'", strings.ReplaceAll(comment, "'", "''")))
		}
	}

	// Add PRIMARY KEY if specified
	for _, col := range columns {
		if extra, ok := col["extra"].(string); ok && strings.Contains(extra, "PRI") {
			colName := fmt.Sprintf("%v", col["columnName"])
			colName = strings.ReplaceAll(colName, "`", "``")
			colType := fmt.Sprintf("%v", col["dataType"])
			colTypeUpper := strings.ToUpper(colType)
			
			// For utf8mb4, MySQL has a max key length of 3072 bytes
			// Each utf8mb4 character can be up to 4 bytes, so max is 768 characters
			// If a VARCHAR/CHAR/TEXT column exceeds this, use a prefix index
			primaryKeyDef := fmt.Sprintf("`%s`", colName)
			
			// TEXT columns always need a prefix index for PRIMARY KEY
			if colTypeUpper == "TEXT" || colTypeUpper == "MEDIUMTEXT" || colTypeUpper == "LONGTEXT" {
				// Use 768 characters prefix (3072 bytes / 4 bytes per char)
				primaryKeyDef = fmt.Sprintf("`%s`(768)", colName)
			} else if colTypeUpper == "VARCHAR" || colTypeUpper == "CHAR" {
				// For VARCHAR/CHAR, check if length exceeds key limit
				if charMaxLength, ok := col["charMaxLength"].(float64); ok && charMaxLength > 0 {
					// Calculate max bytes: charMaxLength * 4 (for utf8mb4)
					maxBytes := int(charMaxLength) * 4
					// If exceeds 3072 bytes, use prefix index (768 chars = 3072 bytes)
					if maxBytes > 3072 {
						prefixLength := 768
						primaryKeyDef = fmt.Sprintf("`%s`(%d)", colName, prefixLength)
					}
				}
			}
			
			sql.WriteString(fmt.Sprintf(",\n  PRIMARY KEY (%s)", primaryKeyDef))
			break
		}
	}

	sql.WriteString("\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")
	return sql.String()
}

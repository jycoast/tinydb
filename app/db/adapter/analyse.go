package adapter

import (
	"tinydb/app/analyser/mongoAnalyser"
	"tinydb/app/analyser/mysqlAnalyser"
	"tinydb/app/db"
	"tinydb/app/db/adapter/mongo"
	"tinydb/app/db/adapter/mysql"
)

func AnalyseFull(driver db.Session, database string) map[string]interface{} {
	switch driver.Dialect() {
	case mongo.Adapter:
		analyser := mongoAnalyser.NewAnalyser(driver, database)
		return analyser.DatabaseAnalyser.AddEngineField(analyser.RunAnalysis())
	case mysql.Adapter:
		analyser := mysqlAnalyser.NewAnalyser(driver, database)
		return analyser.DatabaseAnalyser.AddEngineField(analyser.RunAnalysis())
	default:
		return nil
	}
}

func AnalyseIncremental() {

}

// 查询表
func CreateDumper() {

}

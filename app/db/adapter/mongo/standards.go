package mongo

import (
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"tinydb/app/db/standard/modules"
)

func (s *Source) Dialect() string {
	return Adapter
}

func (s *Source) Ping() error {
	return s.client.Ping(s.ctx, nil)
}

func (s *Source) Version() (*modules.Version, error) {
	//todo 这里是写死，有问题，需要调整。
	db := s.client.Database("local")
	buildInfoCmd := bson.D{bson.E{Key: "buildInfo", Value: 1}}
	var buildInfoDoc bson.M
	if err := db.RunCommand(s.ctx, buildInfoCmd).Decode(&buildInfoDoc); err != nil {
		return nil, err
	}

	return &modules.Version{
		Version:     fmt.Sprintf("%s", buildInfoDoc["version"]),
		VersionText: fmt.Sprintf("MongoDB %s", buildInfoDoc["version"]),
	}, nil
}

func (s *Source) Close() error {
	if s.client != nil {
		return s.client.Connect(s.ctx)
	}
	return nil
}

func (s *Source) ListDatabases() (interface{}, error) {

	buildInfoCmd := bson.D{bson.E{Key: "listDatabases", Value: 1}}
	var buildInfoDoc modules.MongoDBDatabaseList
	db := s.client.Database("admin")
	err := db.RunCommand(s.ctx, buildInfoCmd).Decode(&buildInfoDoc)
	return buildInfoDoc.Databases, err
}

func (s *Source) Query(sql string) (interface{}, error) {
	return nil, nil
}

func (s *Source) CreateDatabase(name string) error {
	if s.client == nil {
		return fmt.Errorf("not connected")
	}
	
	// In MongoDB, creating a database is done by using it and creating a collection
	// We'll create a temporary collection and then drop it to ensure the database exists
	db := s.client.Database(name)
	
	// Create a temporary collection to ensure the database is created
	// MongoDB creates databases lazily when you first write to them
	tempCollection := db.Collection("_temp_create_db")
	
	// Insert and immediately delete a document to create the database
	_, err := tempCollection.InsertOne(s.ctx, bson.M{"_temp": true})
	if err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}
	
	// Drop the temporary collection
	_ = tempCollection.Drop(s.ctx)
	
	return nil
}

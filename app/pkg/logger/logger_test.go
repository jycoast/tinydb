package logger_test

import (
	"testing"
	"tinydb/app/pkg/logger"
)

func TestInitLogger(t *testing.T) {
	logger.Infof("test")
}

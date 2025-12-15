package mysql

import (
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"tinydb/app/db"
)

// ConnectionURL implements a MSSQL connection struct.
type ConnectionURL struct {
	User     string            `json:"username"`
	Password string            `json:"password"`
	Port     string            `json:"port"`
	Database string            `json:"database"`
	Host     string            `json:"host"`
	Socket   string            `json:"socket,omitempty"`
	Options  map[string]string `json:"options,omitempty"`
}

func (c ConnectionURL) String() (s string) {
	// Adding username.
	if c.User != "" {
		s = s + c.User
		// Adding password.
		if c.Password != "" {
			s = s + ":" + c.Password
		}
		s = s + "@"
	}

	// Adding protocol and address
	if c.Socket != "" {
		s = s + fmt.Sprintf("unix(%s)", c.Socket)
	} else if c.Host != "" {
		host, port, err := net.SplitHostPort(c.Host)
		if err != nil {
			// Host doesn't contain port, use Host and Port field
			host = c.Host
			if c.Port != "" {
				port = c.Port
			} else {
				port = "3306"
			}
		} else {
			// Host contains port, but if Port field is set, use it instead
			if c.Port != "" {
				port = c.Port
			}
		}
		s = s + fmt.Sprintf("tcp(%s:%s)", host, port)
	}

	// Adding database (use empty string if not specified)
	if c.Database != "" {
		s = s + "/" + c.Database
	} else {
		s = s + "/"
	}

	// Do we have any options?
	if c.Options == nil {
		c.Options = map[string]string{}
	}

	// Default options.
	if _, ok := c.Options["charset"]; !ok {
		c.Options["charset"] = "utf8"
	}

	if _, ok := c.Options["parseTime"]; !ok {
		c.Options["parseTime"] = "true"
	}

	// Converting options into URL values.
	vv := url.Values{}

	for k, v := range c.Options {
		vv.Set(k, v)
	}

	// Inserting options.
	if p := vv.Encode(); p != "" {
		s = s + "?" + p
	}

	return s
}

func ParseSetting(connection map[string]interface{}) (*ConnectionURL, error) {
	if connection == nil {
		return nil, db.ErrInvalidConnection
	}

	// Handle field name mapping: support both "user"/"username" and "server"/"host"
	normalized := make(map[string]interface{})
	for k, v := range connection {
		normalized[k] = v
	}

	// Map "user" to "username" if present
	if user, ok := connection["user"]; ok && connection["username"] == nil {
		normalized["username"] = user
	}

	// Map "server" to "host" if present
	if server, ok := connection["server"]; ok && connection["host"] == nil {
		normalized["host"] = server
	}

	marshal, err := json.Marshal(&normalized)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal connection: %w", err)
	}
	urlDSN := &ConnectionURL{}
	err = json.Unmarshal(marshal, urlDSN)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal connection: %w", err)
	}

	// Log connection details (without password) for debugging
	fmt.Printf("Parsed MySQL connection: Host=%s, Port=%s, User=%s, Database=%s, Password=%s\n",
		urlDSN.Host, urlDSN.Port, urlDSN.User, urlDSN.Database,
		func() string {
			if urlDSN.Password != "" {
				return "***"
			}
			return "(empty)"
		}())

	// Validate required fields (password can be empty for some configurations)
	if urlDSN.User == "" {
		return nil, fmt.Errorf("lack of user/username")
	}
	if urlDSN.Host == "" && urlDSN.Socket == "" {
		return nil, fmt.Errorf("lack of host/server or socket")
	}

	return urlDSN, nil
}

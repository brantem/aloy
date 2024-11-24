package model

import (
	"fmt"
	"time"
)

type Time struct {
	time.Time
}

func (t *Time) Scan(value any) error {
	if str, ok := value.(string); ok {
		parsed, err := time.Parse("2006-01-02 15:04:05", str)
		if err != nil {
			return err
		}
		*t = Time{parsed}
		return nil
	}
	if b, ok := value.([]byte); ok {
		parsed, err := time.Parse("2006-01-02 15:04:05", string(b))
		if err != nil {
			return err
		}
		*t = Time{parsed}
		return nil
	}
	return fmt.Errorf("unsupported time format: %T", value)
}

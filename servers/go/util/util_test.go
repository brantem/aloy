package util

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetenv(t *testing.T) {
	assert.Equal(t, "a", Getenv("A", "a"))
	t.Setenv("A", "b")
	assert.Equal(t, "b", Getenv("A", "a"))
}

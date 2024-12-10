package storage

import (
	"context"

	"github.com/brantem/aloy/storage"
	_ "github.com/mattn/go-sqlite3"
)

type Storage struct {
	UploadN     int
	UploadOpts  []*storage.UploadOpts
	UploadError []error

	DeleteMultipleN     int
	DeleteMultipleKeys  [][]string
	DeleteMultipleError []error
}

func New() *Storage {
	return &Storage{}
}

func (s *Storage) Upload(ctx context.Context, opts *storage.UploadOpts) error {
	s.UploadOpts = append(s.UploadOpts, opts)
	var err error
	if len(s.UploadError) != 0 {
		err = s.UploadError[s.UploadN]
	}
	s.UploadN += 1
	return err
}

func (s *Storage) DeleteMultiple(ctx context.Context, keys []string) error {
	s.DeleteMultipleKeys = append(s.DeleteMultipleKeys, keys)
	var err error
	if len(s.DeleteMultipleError) != 0 {
		err = s.DeleteMultipleError[s.DeleteMultipleN]
	}
	s.DeleteMultipleN += 1
	return err
}

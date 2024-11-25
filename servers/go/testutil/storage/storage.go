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

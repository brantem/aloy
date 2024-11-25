package handler

import (
	"context"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/brantem/aloy/errs"
	"github.com/brantem/aloy/storage"
	"github.com/galdor/go-thumbhash"
	"github.com/rs/zerolog/log"
	_ "golang.org/x/image/webp"
)

type UploadAttachmentResult struct {
	URL  string
	Data map[string]string
}

func (h *Handler) uploadAttachments(ctx context.Context, parts map[string][]*multipart.FileHeader) ([]*UploadAttachmentResult, error) {
	m := make(map[string]*multipart.FileHeader, len(parts))
	me := make(errs.MapErrors, len(parts))

	for key, files := range parts {
		if !strings.HasPrefix(key, "attachments") {
			continue
		}

		if len(m) >= h.config.attachmentMaxCount {
			return nil, errs.MapErrors{"attachments": errs.NewCodeError("TOO_MANY")}
		}

		fh := files[0]
		if fh.Size > int64(h.config.attachmentMaxSize) {
			me[key] = errs.NewCodeError("TOO_BIG")
			continue
		}

		_type := fh.Header.Get("Content-Type")
		if !slices.Contains(h.config.attachmentSupportedTypes, _type) {
			me[key] = errs.NewCodeError("UNSUPPORTED")
			continue
		}

		m[key] = fh
	}

	if len(me) != 0 {
		log.Error().Any("me", me).Send()
		return nil, me
	}

	result := make([]*UploadAttachmentResult, 0, len(m))
	for key, fh := range m {
		_type := fh.Header.Get("Content-Type")

		file, err := fh.Open()
		if err != nil {
			log.Error().Err(err).Str("key", key).Msg("comment.uploadAttachments")
			return nil, errs.ErrInternalServerError
		}

		img, _, err := image.Decode(file)
		if err != nil {
			log.Error().Err(err).Str("key", key).Msg("comment.uploadAttachments")
			return nil, errs.ErrInternalServerError
		}

		if _, err := file.Seek(0, io.SeekStart); err != nil {
			log.Error().Err(err).Msg("comment.uploadAttachments")
			return nil, errs.ErrInternalServerError
		}

		fileName := fmt.Sprintf("%d%s", time.Now().Unix()*1000, filepath.Ext(fh.Filename))
		opts := &storage.UploadOpts{
			Key:           "attachments/" + fileName,
			Body:          file,
			ContentType:   _type,
			ContentLength: fh.Size,
		}
		if err := h.storage.Upload(ctx, opts); err != nil {
			log.Error().Err(err).Str("key", key).Msg("comment.uploadAttachments")
			return nil, errs.ErrInternalServerError
		}

		result = append(result, &UploadAttachmentResult{
			URL: fmt.Sprintf("%s/%s", h.config.attachmentBaseURL, fileName),
			Data: map[string]string{
				"type": _type,
				"hash": base64.StdEncoding.EncodeToString(thumbhash.EncodeImage(img)),
			},
		})
	}

	return result, nil
}

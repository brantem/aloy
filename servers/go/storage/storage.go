package storage

import (
	"context"
	"io"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/brantem/aloy/constant"
	"github.com/brantem/aloy/util"
	"github.com/rs/zerolog/log"
)

type StorageInterface interface {
	Upload(ctx context.Context, opts *UploadOpts) error
}

type Storage struct {
	client *s3.Client
	bucket string
}

func New(ctx context.Context) *Storage {
	creds := credentials.NewStaticCredentialsProvider(os.Getenv("STORAGE_ACCESS_KEY_ID"), os.Getenv("STORAGE_ACCESS_KEY_SECRET"), "")
	cfg, err := config.LoadDefaultConfig(
		ctx,
		config.WithRegion("auto"),
		config.WithAppID(constant.AppID),
		config.WithCredentialsProvider(creds),
	)
	if err != nil {
		log.Fatal().Err(err).Msg("storage.New")
	}

	return &Storage{
		client: s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(os.Getenv("STORAGE_ENDPOINT"))
		}),
		bucket: util.Getenv("STORAGE_BUCKET", constant.AppID),
	}
}

type UploadOpts struct {
	Key                string
	Body               io.Reader
	ContentType        string
	CacheControl       string
	ContentDisposition string
}

func (s *Storage) Upload(ctx context.Context, opts *UploadOpts) error {
	if opts.CacheControl == "" {
		opts.CacheControl = "max-age=31536000"
	}

	input := &s3.PutObjectInput{
		Bucket:       aws.String(s.bucket),
		Key:          aws.String(opts.Key),
		Body:         opts.Body,
		ContentType:  aws.String(opts.ContentType),
		CacheControl: aws.String(opts.CacheControl),
	}
	if opts.ContentDisposition != "" {
		input.ContentDisposition = aws.String(opts.ContentDisposition)
	}

	if _, err := s.client.PutObject(ctx, input); err != nil {
		log.Error().Err(err).Msg("storage.Upload")
		return constant.ErrInternalServerError
	}

	return nil
}

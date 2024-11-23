package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/brantem/aloy/constant"
	"github.com/brantem/aloy/db"
	"github.com/brantem/aloy/handler"
	"github.com/brantem/aloy/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/etag"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/pprof"
	"github.com/gofiber/fiber/v2/middleware/recover"
	_ "github.com/joho/godotenv/autoload"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/rs/zerolog/pkgerrors"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	isDebug := os.Getenv("DEBUG") == "1"
	if isDebug {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
		zerolog.ErrorStackMarshaler = pkgerrors.MarshalStack
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout}).With().Caller().Logger()
	}

	db := db.New()

	app := fiber.New(fiber.Config{
		AppName:               constant.AppID,
		DisableStartupMessage: os.Getenv("APP_ENV") == "production",
	})

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).Send([]byte("ok"))
	})

	app.Hooks().OnShutdown(func() error {
		db.Close()
		return nil
	})

	app.Use(pprof.New())

	app.Use(cors.New(cors.Config{
		AllowOrigins:  util.Getenv("ALLOW_ORIGINS", "*"),
		AllowHeaders:  "Content-Type, Aloy-App-ID, Aloy-User-ID",
		ExposeHeaders: "X-Total-Count",
	}))
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))
	app.Use(etag.New())
	app.Use(helmet.New())
	app.Use(recover.New(recover.Config{
		EnableStackTrace: isDebug,
	}))
	app.Use(logger.New())

	h := handler.New(db)
	h.Register(app, middleware.New())

	go func() {
		if err := app.Listen(":" + os.Getenv("PORT")); err != nil {
			log.Fatal().Err(err).Send()
		}
	}()

	<-ctx.Done()
	stop()
	app.Shutdown()

}

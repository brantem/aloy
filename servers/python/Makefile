prepare:
	sqlite3 ../data.db < ../migrations/0000_init.sql

dev:
	uv run flask --app server run --debug -p 4000

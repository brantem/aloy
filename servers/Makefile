prepare:
	@for file in $(shell ls migrations/*.sql | sort); do \
		sqlite3 data.db < $$file; \
	done

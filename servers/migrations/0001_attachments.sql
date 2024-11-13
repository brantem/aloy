-- Migration number: 0001 	 2024-11-06T06:57:12.934Z
CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL,
  url TEXT NOT NULL,
  data TEXT,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sporty INTEGER NOT NULL CHECK (sporty >= 0 AND sporty <= 10),
  creative INTEGER NOT NULL CHECK (creative >= 0 AND creative <= 10),
  social INTEGER NOT NULL CHECK (social >= 0 AND social <= 10),
  logical INTEGER NOT NULL CHECK (logical >= 0 AND logical <= 10),
  adventurous INTEGER NOT NULL CHECK (adventurous >= 0 AND adventurous <= 10),
  calm INTEGER NOT NULL CHECK (calm >= 0 AND calm <= 10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON quiz_results(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);

/* ===== DATABASE ===== */
CREATE DATABASE IF NOT EXISTS pesowise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pesowise;

/* ===== USERS ===== */
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  fullname      VARCHAR(40)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  allowance     DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_date    DATE NULL,
  end_date      DATE NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

/* ===== EXPENSES ===== */
CREATE TABLE IF NOT EXISTS expenses (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id  INT UNSIGNED NOT NULL,
  amount   DECIMAL(10,2) NOT NULL,
  note     VARCHAR(40)  NOT NULL DEFAULT '',
  category VARCHAR(20)  NOT NULL,
  spent_on DATE NOT NULL,
  INDEX idx_user_date (user_id, spent_on),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

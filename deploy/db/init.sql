-- Complete Coach Database Init
-- Runs on first container creation only

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional crypto functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

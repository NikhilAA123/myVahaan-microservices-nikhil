// Import the Pool class from the 'pg' library
const { Pool } = require("pg");
require("dotenv").config();

// Create a new connection pool.
// The pool is the recommended way to connect to Postgres with Node.js.
// It manages multiple client connections automatically.
// It will use the DATABASE_URL environment variable from docker-compose.yml.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// We export a single query function that we'll use throughout our application.
// This allows us to easily use the connection pool from any file.
module.exports = {
  query: (text, params) => pool.query(text, params),
};

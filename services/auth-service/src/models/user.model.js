// Import our centralized database connection from the config directory
const db = require("../config/db");

// The User object will encapsulate all database operations for the 'users' table.
const User = {
  /**
   * Creates a new user in the database.
   * @param {object} user - An object containing the user's details.
   * @param {string} user.name - The user's full name.
   * @param {string} user.email - The user's unique email.
   * @param {string} user.phone - The user's phone number.
   * @param {string} user.passwordHash - The pre-hashed password.
   * @param {string} [user.role='passenger'] - The user's role.
   * @returns {Promise<object>} The newly created user record (without the password hash).
   */
  async create({ name, email, phone, passwordHash, role = "passenger" }) {
    // This SQL query inserts a new user into the 'users' table.
    // The RETURNING clause is a PostgreSQL feature that returns the specified columns
    // of the newly created row, which is very efficient.
    const sql = `
      INSERT INTO users(name, email, phone, password_hash, role)
      VALUES($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, created_at
    `;

    // We use parameterized queries ($1, $2, etc.) to pass variables.
    // This is a critical security measure to prevent SQL injection attacks.
    const result = await db.query(sql, [
      name,
      email,
      phone,
      passwordHash,
      role,
    ]);

    // The query result object has a 'rows' property, which is an array of records.
    // For an INSERT...RETURNING statement, it will contain the single new user.
    return result.rows[0];
  },

  /**
   * Finds a user by their unique email address.
   * @param {string} email - The email address to search for.
   * @returns {Promise<object|undefined>} The user record if found, otherwise undefined.
   */
  async findByEmail(email) {
    const sql = "SELECT * FROM users WHERE email = $1";
    const result = await db.query(sql, [email]);

    // If a user is found, result.rows will contain one object.
    // If not found, it will be an empty array, and result.rows[0] will be undefined.
    return result.rows[0];
  },

  /**
   * Finds a user by their unique ID.
   * @param {string} id - The UUID of the user to find.
   * @returns {Promise<object|undefined>} The user record if found, otherwise undefined.
   */
  async findById(id) {
    const sql = "SELECT * FROM users WHERE id = $1";
    const result = await db.query(sql, [id]);
    return result.rows[0];
  },
};

// Export the User object to make its methods available to other parts of the application.
module.exports = User;

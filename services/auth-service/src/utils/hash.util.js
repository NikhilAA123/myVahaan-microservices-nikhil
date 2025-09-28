// Import the bcryptjs library for password hashing
const bcrypt = require("bcryptjs");

/**
 * Hashes a plain-text password using bcrypt.
 * @param {string} password - The plain-text password to hash.
 * @returns {string} The resulting password hash.
 */
const hashPassword = (password) => {
  // The '10' is the salt round, a measure of how complex the hash will be.
  return bcrypt.hashSync(password, 10);
};

/**
 * Compares a plain-text password against a hash to see if they match.
 * @param {string} password - The plain-text password from user input.
 * @param {string} hash - The stored password hash from the database.
 * @returns {boolean} True if the passwords match, false otherwise.
 */
const comparePassword = (password, hash) => {
  return bcrypt.compareSync(password, hash);
};

// Export the functions so they can be used in other files
module.exports = {
  hashPassword,
  comparePassword,
};

const db = require("../config/db");

const Driver = {
  // For now, this is a simple function to find the first available driver.
  // In the future, we could make this much smarter (e.g., find by location).
  async findAvailableDriver() {
    const sql = `
      SELECT id, name, email, phone 
      FROM users 
      WHERE role = 'driver' AND is_available = true 
      LIMIT 1
    `;
    const result = await db.query(sql);
    return result.rows[0]; // Returns the first driver found, or undefined if none are available
  },
};

module.exports = Driver;

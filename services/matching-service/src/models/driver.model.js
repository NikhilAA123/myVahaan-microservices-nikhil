const db = require("../config/db");

const Driver = {
  // --- THIS IS THE FIX ---
  // We are replacing the old, simple function with this new, smarter one.
  // It now accepts an array of hexagon IDs and finds all available drivers within them.
  async findAvailableDriversInHexagons(hexagonIDs) {
    const sql = `
      SELECT id, name, email, phone, current_h3_index
      FROM users 
      WHERE role = 'driver' 
        AND is_available = true 
        AND current_h3_index = ANY($1::text[])
    `;
    // The '= ANY($1)' syntax is a powerful PostgreSQL feature for searching within an array.
    const result = await db.query(sql, [hexagonIDs]);
    return result.rows;
  },
};

module.exports = Driver;

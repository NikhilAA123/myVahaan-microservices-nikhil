const db = require("../config/db");

const Ride = {
  async create({ passengerId, pickupLat, pickupLng, dropLat, dropLng }) {
    const sql = `
          INSERT INTO rides(passenger_id, pickup_lat, pickup_lng, drop_lat, drop_lng, status)
          VALUES($1, $2, $3, $4, $5, 'requested')
          RETURNING *
        `;
    const result = await db.query(sql, [
      passengerId,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
    ]);
    return result.rows[0];
  },
};

module.exports = Ride;

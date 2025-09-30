const express = require("express");
const router = express.Router();

// The module now accepts the rideClient and the authMiddleware bouncer
module.exports = function (rideClient, authMiddleware) {
  /**
   * @route   POST /request
   * @desc    Request a new ride
   * @access  Private (Requires JWT)
   */
  // The bouncer, 'authMiddleware', is placed right before the main logic.
  // It will run first, validating the token.
  router.post("/request", authMiddleware, (req, res) => {
    // If the bouncer succeeds, the user's ID is available on req.user.id
    const passengerId = req.user.id;
    const { pickupLat, pickupLng, dropLat, dropLng } = req.body;

    rideClient.RequestRide(
      { passengerId, pickupLat, pickupLng, dropLat, dropLng },
      (err, response) => {
        if (err || !response) {
          console.error("❌ Gateway: gRPC Error during RequestRide:", err);
          return res
            .status(500)
            .json({
              message: "Internal server error or ride service unavailable",
            });
        }
        res.status(response.status === "OK" ? 201 : 400).json(response);
      }
    );
  });

  return router;
};

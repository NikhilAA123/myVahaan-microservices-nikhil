const express = require("express");
const router = express.Router();

// --- THIS IS THE FIX ---
// The module now accepts BOTH the client and the middleware.
module.exports = function (authClient, authMiddleware) {
  // --- PUBLIC ROUTES (No bouncer) ---
  router.post("/register", (req, res) => {
    const { name, phone, email, password } = req.body;
    authClient.Register({ name, phone, email, password }, (err, response) => {
      if (err || !response) {
        console.error("❌ Gateway: gRPC Error during Register:", err);
        return res
          .status(500)
          .json({
            message: "Internal server error or auth service unavailable",
          });
      }
      if (response.status === "OK") {
        res.status(201).json(response);
      } else {
        res.status(400).json(response);
      }
    });
  });

  router.post("/login", (req, res) => {
    const { email, password } = req.body;
    authClient.Login({ email, password }, (err, response) => {
      if (err || !response) {
        console.error("❌ Gateway: gRPC Error during Login:", err);
        return res
          .status(500)
          .json({
            message: "Internal server error or auth service unavailable",
          });
      }
      if (response.status === "OK") {
        res.status(200).json(response);
      } else {
        res.status(401).json(response);
      }
    });
  });

  // --- PROTECTED ROUTES ("VIP Room") ---

  /**
   * @route   GET /me
   * @desc    Get the profile of the currently logged-in user
   * @access  Private (Requires JWT)
   */
  // Now, 'authMiddleware' is a valid function that has been passed in.
  router.get("/me", authMiddleware, (req, res) => {
    if (req.user) {
      res.status(200).json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  return router;
};

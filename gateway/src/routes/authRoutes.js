const express = require("express");
const router = express.Router();

// This function receives the gRPC client ("the tool") from index.js.
module.exports = function (authClient) {
  router.post("/register", (req, res) => {
    const { name, phone, email, password } = req.body;

    // Now, authClient is guaranteed to be a valid gRPC client.
    authClient.Register({ name, phone, email, password }, (err, response) => {
      if (err || !response) {
        // Also check if response is null
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

  return router;
};

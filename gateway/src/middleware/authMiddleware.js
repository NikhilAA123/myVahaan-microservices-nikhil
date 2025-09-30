// This is our "bouncer" middleware.

// We need to pass the gRPC client to it, so we wrap it in a function.
module.exports = function (authClient) {
  return function (req, res, next) {
    // 1. Get the token from the request header.
    // The standard format is "Authorization: Bearer <token>"
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    // 2. Extract the token from the "Bearer <token>" string.
    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res
        .status(401)
        .json({ message: "Invalid token format. Must be 'Bearer <token>'." });
    }
    const token = tokenParts[1];

    // 3. Ask the auth-service to validate the token.
    authClient.ValidateToken({ token }, (err, response) => {
      if (err || !response) {
        console.error("❌ Gateway: gRPC Error during ValidateToken:", err);
        return res.status(500).json({ message: "Auth service unavailable" });
      }

      // 4. Check the response from the auth-service.
      if (response.isValid) {
        // SUCCESS! The token is valid.
        // Attach the user's info to the request object for later use.
        req.user = {
          id: response.userId,
          role: response.role,
        };
        // Let the request proceed to its intended destination.
        next();
      } else {
        // FAILURE! The token is invalid or expired. Deny access.
        res
          .status(401)
          .json({ message: "Access denied. Invalid or expired token." });
      }
    });
  };
};

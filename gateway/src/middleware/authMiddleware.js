module.exports = function (authClient) {
  return function (req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(401).json({ message: "Invalid token format." });
    }
    const token = tokenParts[1];

    authClient.ValidateToken({ token }, (err, response) => {
      if (err || !response) {
        console.error("❌ Gateway: gRPC Error during ValidateToken:", err);
        return res.status(500).json({ message: "Auth service unavailable" });
      }

      if (response.isValid) {
        req.user = { id: response.userId, role: response.role };
        next();
      } else {
        res.status(401).json({ message: "Access denied. Invalid token." });
      }
    });
  };
};

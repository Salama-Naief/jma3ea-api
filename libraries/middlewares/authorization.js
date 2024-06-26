// Load required modules
const status_message = require("../../enums/status_message");

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
  let excludedUrls = ["/api/v2/auth/check"];
  console.log("req.custom.class", req.custom.class);
  console.log("req.custom.action", req.custom.action);

  if (
    excludedUrls.indexOf(req.url) > -1 ||
    (req.custom.class === "auth" &&
      req.custom.action === "check" &&
      req.method === "POST") ||
    (req.custom.class === "profile" &&
      req.custom.action === "resetpassword" &&
      req.method === "PUT") ||
    ["country", "city", "page"].indexOf(req.custom.class) > -1 ||
    req.method === "OPTIONS"
  ) {
    console.log("next", req.custom.action);
    next();

    return;
  }

  const local = req.custom.local;
  const token = req.headers.authorization
    ? req.headers.authorization.replace("Bearer ", "")
    : null;
  if (!token) {
    res.out(
      {
        message: local.no_token,
      },
      status_message.UNEXPECTED_ERROR
    );
    return;
  }

  const cache = req.custom.cache;
  cache
    .get(token)
    .then((row) => {
      // TODO: Fix Agent
      // const user_agent = req.get('User-Agent') || null;
      // row.userAgent === user_agent
      if (row) {
        req.custom.token = token;
        req.custom.authorizationObject = row;
        next();
      } else {
        res.out(
          {
            message: local.failed_auth,
          },
          status_message.INVALID_APP_AUTHENTICATION
        );
      }
    })
    .catch((error) =>
      res.out(
        {
          message: local.failed_auth,
          error: error,
        },
        status_message.UNEXPECTED_ERROR
      )
    );
};

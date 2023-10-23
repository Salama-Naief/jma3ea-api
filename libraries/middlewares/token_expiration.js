/**
 * Middleware for caching
 */
module.exports = (req, res, next) => {
  if (
    !req.custom.authorizationObject.member_id &&
    req.custom.config.cache.life_time.visitor_token
  ) {
    req.custom.config.cache.life_time.token =
      req.custom.config.cache.life_time.visitor_token;
  }
  next();
};

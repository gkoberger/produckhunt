module.exports = function(req, res, next) {
  res.locals.json = JSON.stringify;
  next();
};

const identityMiddleware = (req, res, next) => {
  if (!req.session.name) {
    return res.status(400).json({ message: "You have to set your name first.", });
  }

  next();
};

module.exports = identityMiddleware;
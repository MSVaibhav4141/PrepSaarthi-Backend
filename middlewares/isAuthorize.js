const ErrorHandler = require("../utils/errorHandeler");
const errorCatcherAsync = require("../utils/errorCatcherAsync");
const jwt = require("jsonwebtoken");
const Mentor = require("../models/mentorModel");

const isAuthorize = errorCatcherAsync(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please Login to access this resource", 401));
  }
  
  const data = jwt.verify(token, process.env.JWT_SEC);
  
  req.user = await Mentor.findById(data.id);
  next();
});

module.exports = isAuthorize;
 
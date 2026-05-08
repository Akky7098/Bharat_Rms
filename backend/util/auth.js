const jwt = require("jsonwebtoken");
const  User  = require("../model/userModel"); 
require("dotenv").config();

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Token missing." });
  }

  try {
    const decoded = jwt.verify(token,"abc123");
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(403).json({ message: "Unauthorized: Invalid or expired session." });
    }
    
    req.user = {
      _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
};

    next();
  } catch (err) {
    res.status(403).json({ message: "Forbidden: Invalid token." });
  }
};
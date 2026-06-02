const User = require("../model/userModel");
const jwt = require("jsonwebtoken");

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  console.log(user)
  if (!user) {
    throw new Error("Invalid email or password");
  }
   
   const userPassword = user.password;

  if (password != userPassword) {
    throw new Error("Invalid  password");
  }

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    "abc123",
    {
      expiresIn: "30d",
    }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

module.exports = {
  loginUser,
};

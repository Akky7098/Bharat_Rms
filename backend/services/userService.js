const User = require("../model/userModel");

const getSalesPersons = async () => {
  const users = await User.find(
    { role: { $in: ["user"] } }, 
    "_id name email"
  );

  return users;
};

module.exports = {
  getSalesPersons,
};
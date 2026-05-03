const userService = require("../services/userService");

const getSalesPersons = async (req, res) => {
  try {
    const users = await userService.getSalesPersons();

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSalesPersons,
};
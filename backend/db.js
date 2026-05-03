const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("database connected successfully");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

module.exports = connectDB;
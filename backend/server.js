const app = require("./app")
const connectDB  = require("./db");
const PORT = process.env.PORT || 3000;
const User = require("./model/userModel");

// const createSuperAdmin = async () => {
//   try {
//     const existingUser = await User.findOne({
//       email: "sales@bharatspecialsteels.com",
//     });

//     if (existingUser) {
//       console.log("User already exists");
//       return;
//     }

//     const user = await User.create({
//       name: "Sonia",
//       email: "sales@bharatspecialsteels.com",
//       password: "Bharat#$@2323",
//       role: "user",
//     });

//     console.log("user:", user);
//   } catch (error) {
//     console.log(error.message);
//   }
// };

// // Call once
// createSuperAdmin();


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
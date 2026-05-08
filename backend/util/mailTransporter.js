const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "bsspl97@gmail.com",
    pass: "sfta uuym syiz iezg",
  },
});
module.exports = transporter;


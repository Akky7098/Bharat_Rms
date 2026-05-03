const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "bsspl97@gmail.com",
    pass: "kxtf qhkh zrka zgao",
  },
});

module.exports = transporter;
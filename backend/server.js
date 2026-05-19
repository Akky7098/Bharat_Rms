require("dotenv").config();
const startPaymentReminderCron = require("./cron/paymentReminderCron");
const app = require("./app");
const connectDB = require("./db");


const PORT = process.env.PORT || 5000;

connectDB();

app.get("/", (req, res) => {
  res.send("Backend is running");
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
   startPaymentReminderCron();
});


require("dotenv").config();

const app = require("./app");
const connectDB = require("./db");
const { initWhatsappClient } = require("./util/whatsappClient");

const PORT = process.env.PORT || 5000;

connectDB();
initWhatsappClient();
app.get("/", (req, res) => {
  res.send("Backend is running");
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


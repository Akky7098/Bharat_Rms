const mongoose = require("mongoose");

const connectDB = mongoose.connect(
  "mongodb://Bharat_rms:Bharat%40%23%243774@ac-rfaqsoz-shard-00-00.xrq5ycd.mongodb.net:27017,ac-rfaqsoz-shard-00-01.xrq5ycd.mongodb.net:27017,ac-rfaqsoz-shard-00-02.xrq5ycd.mongodb.net:27017/Bharat_Database?ssl=true&replicaSet=atlas-qdeh24-shard-0&authSource=admin&appName=Cluster0"
)
.then(() => {
  console.log("database connected successfully");
  
})
.catch((err) => {
  console.log(err);
});

module.exports = connectDB;

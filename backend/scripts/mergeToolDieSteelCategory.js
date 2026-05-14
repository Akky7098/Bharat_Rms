const mongoose = require("mongoose");
require("dotenv").config();

const Enquiry = require("../model/enquiryModel");

const mergeToolDieSteelCategory = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const result = await Enquiry.updateMany(
      {
        productCategory: {
          $in: ["tool_steel", "die_steel"],
        },
      },
      {
        $set: {
          productCategory: "tool_and_die_steel",
        },
      }
    );

    console.log("Migration completed");
    console.log("Matched:", result.matchedCount);
    console.log("Modified:", result.modifiedCount);

    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

mergeToolDieSteelCategory();
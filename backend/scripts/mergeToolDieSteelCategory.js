const mongoose = require("mongoose");
require("dotenv").config();

const Enquiry = require("../model/enquiryModel");

const mergeToolDieSteelCategory = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const oldValues = ["tool_steel", "die_steel"];
    const newValue = "tool_and_die_steel";

    const beforeToolCount = await Enquiry.countDocuments({
      productCategory: "tool_steel",
    });

    const beforeDieCount = await Enquiry.countDocuments({
      productCategory: "die_steel",
    });

    const beforeNewCount = await Enquiry.countDocuments({
      productCategory: newValue,
    });

    console.log("Before migration:");
    console.log("tool_steel:", beforeToolCount);
    console.log("die_steel:", beforeDieCount);
    console.log("tool_and_die_steel:", beforeNewCount);

    const result = await Enquiry.collection.updateMany(
      {
        productCategory: {
          $in: oldValues,
        },
      },
      {
        $set: {
          productCategory: newValue,
        },
      }
    );

    const afterToolCount = await Enquiry.countDocuments({
      productCategory: "tool_steel",
    });

    const afterDieCount = await Enquiry.countDocuments({
      productCategory: "die_steel",
    });

    const afterNewCount = await Enquiry.countDocuments({
      productCategory: newValue,
    });

    console.log("Migration completed");
    console.log("Matched:", result.matchedCount);
    console.log("Modified:", result.modifiedCount);

    console.log("After migration:");
    console.log("tool_steel:", afterToolCount);
    console.log("die_steel:", afterDieCount);
    console.log("tool_and_die_steel:", afterNewCount);

    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

mergeToolDieSteelCategory();
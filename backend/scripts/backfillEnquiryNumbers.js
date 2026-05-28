require("dotenv").config();

const mongoose = require("mongoose");
const Enquiry = require("../model/enquiryModel");
const User = require("../model/userModel");

const MONGO_URI = process.env.MONGO_URI;

const formatFirstName = (name = "") => {
  const firstNameRaw = String(name || "User").trim().split(" ")[0] || "User";

  return (
    firstNameRaw.charAt(0).toUpperCase() +
    firstNameRaw.slice(1).toLowerCase()
  );
};

const run = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI missing in .env");
    }

    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    const enquiries = await Enquiry.find({
      $or: [
        { enquiryNumber: { $exists: false } },
        { enquiryNumber: "" },
        { enquiryNumber: null },
      ],
    })
      .sort({ salesPersonId: 1, createdAt: 1, _id: 1 })
      .lean();

    console.log(`🔎 Enquiries without number found: ${enquiries.length}`);

    const counters = {};
    let updatedCount = 0;
    let skippedCount = 0;

    for (const enquiry of enquiries) {
      if (!enquiry.salesPersonId) {
        console.log(`⚠️ Skipped enquiry ${enquiry._id}: missing salesPersonId`);
        skippedCount++;
        continue;
      }

      const salesPersonId = String(enquiry.salesPersonId);

      const user = await User.findById(salesPersonId).lean();

      if (!user) {
        console.log(
          `⚠️ Skipped enquiry ${enquiry._id}: user not found ${salesPersonId}`
        );
        skippedCount++;
        continue;
      }

      const firstName = formatFirstName(user.name);

      if (!counters[salesPersonId]) {
        const existingCount = await Enquiry.countDocuments({
          salesPersonId: enquiry.salesPersonId,
          enquiryNumber: { $exists: true, $nin: ["", null] },
        });

        counters[salesPersonId] = existingCount;
      }

      counters[salesPersonId] += 1;

      const enquiryNumber = `${firstName}-${counters[salesPersonId]}`;

      await Enquiry.updateOne(
        { _id: enquiry._id },
        {
          $set: {
            enquiryNumber,
          },
        }
      );

      updatedCount++;

      console.log(
        `✅ Updated ${enquiry._id} | ${user.name} | ${enquiryNumber}`
      );
    }

    console.log("==================================");
    console.log(`✅ Total updated: ${updatedCount}`);
    console.log(`⚠️ Total skipped: ${skippedCount}`);
    console.log("==================================");

    await mongoose.disconnect();
    console.log("✅ MongoDB disconnected");

    process.exit(0);
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
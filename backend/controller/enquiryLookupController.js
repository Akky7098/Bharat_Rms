const enquiryLookupService = require("../services/enquiryLookupService");

const lookupEnquiryForSalesOrder = async (req, res) => {
  try {
    const { enquiryNumber } = req.params;

    const result = await enquiryLookupService.lookupEnquiryForSalesOrder(
      enquiryNumber,
      req.user
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to lookup enquiry.",
    });
  }
};

module.exports = {
  lookupEnquiryForSalesOrder,
};
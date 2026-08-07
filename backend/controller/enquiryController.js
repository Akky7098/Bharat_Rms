const enquiryService = require("../services/enquiryService");
const productGrades = require("../constants/productGrades");

const createEnquiry = async (req, res) => {
  try {
    const enquiry = await enquiryService.createEnquiry(
      JSON.parse(req.body.data),
      req.user,
      req.file
    );

    res.status(201).json({
      success: true,
      message: "Enquiry created successfully",
      data: enquiry,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const getProductConfig = async (req, res) => {
  res.status(200).json({
    success: true,
    data: productGrades,
  });
};
const updateWorkflow = async (req, res) => {
  try {
    const enquiry = await enquiryService.updateWorkflow(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Workflow updated successfully",
      data: enquiry,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const getAllEnquiries = async (req, res) => {
  try {
    const result = await enquiryService.getAllEnquiries(req.query, req.user);

    res.status(200).json({
      success: true,
      data: result.enquiries,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const getLostEnquiryReasons = async (
  req,
  res
) => {
  try {
    const result =
      await enquiryService.getLostEnquiryReasons(
        req.query,
        req.user
      );

    res.status(200).json({
      success: true,

      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,

      message:
        error.message,
    });
  }
};

module.exports = {
  createEnquiry,
  getProductConfig,
  updateWorkflow,
  getAllEnquiries,
  getLostEnquiryReasons,
};

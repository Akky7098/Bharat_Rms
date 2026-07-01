const mtcService = require("../services/mtcService");

const createMtcCertificate = async (req, res) => {
  try {
    const payload = req.body.data ? JSON.parse(req.body.data) : req.body;

    const mtc = await mtcService.createMtcCertificate(payload, req.user);

    return res.status(201).json({
      success: true,
      message: "MTC certificate generated successfully",
      data: mtc,
    });
  } catch (error) {
    console.log("CREATE MTC ERROR =>", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const downloadMtcPdf = async (req, res) => {
  try {
    const result = await mtcService.getMtcPdf(req.params.id);

    return res.download(result.filePath, result.fileName);
  } catch (error) {
    console.log("DOWNLOAD MTC PDF ERROR =>", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};
const getMtcCertificates = async (req, res) => {
  try {
    const mtcList = await mtcService.getMtcCertificates(req.query);

    return res.status(200).json({
      success: true,
      data: mtcList,
    });
  } catch (error) {
    console.log("GET MTC LIST ERROR =>", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  createMtcCertificate,
  getMtcCertificates,
  downloadMtcPdf,
};
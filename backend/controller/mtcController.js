const mtcService = require("../services/mtcService");

/* =========================================================
   CREATE MTC CERTIFICATE
========================================================= */

const createMtcCertificate = async (req, res) => {
  try {
    let payload = req.body;

    /*
     * Supports multipart/form-data where frontend sends:
     *
     * formData.append("data", JSON.stringify(payload));
     */
    if (req.body?.data) {
      try {
        payload =
          typeof req.body.data === "string"
            ? JSON.parse(req.body.data)
            : req.body.data;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid MTC form data",
        });
      }
    }

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        message: "MTC payload is required",
      });
    }

    if (!payload.mtcProvider) {
      return res.status(400).json({
        success: false,
        message: "MTC provider is required",
      });
    }

    const mtc =
      await mtcService.createMtcCertificate(
        payload,
        req.user
      );

    return res.status(201).json({
      success: true,
      message:
        "MTC certificate generated successfully",
      data: mtc,
    });
  } catch (error) {
    console.log(
      "CREATE MTC ERROR =>",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Unable to generate MTC certificate",
    });
  }
};

/* =========================================================
   DOWNLOAD MTC PDF
========================================================= */

const downloadMtcPdf = async (req, res) => {
  try {
    const provider =
      req.query.mtcProvider ||
      req.query.provider ||
      "";

    const result =
      await mtcService.getMtcPdf(
        req.params.id,
        provider
      );

    return res.download(
      result.filePath,
      result.fileName,
      (error) => {
        if (error) {
          console.log(
            "MTC PDF RESPONSE ERROR =>",
            error
          );

          /*
           * Do not send another response if headers
           * have already been sent by res.download().
           */
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              message:
                "Unable to download MTC PDF",
            });
          }
        }

        return undefined;
      }
    );
  } catch (error) {
    console.log(
      "DOWNLOAD MTC PDF ERROR =>",
      error
    );

    return res.status(404).json({
      success: false,
      message:
        error.message ||
        "MTC PDF not found",
    });
  }
};

/* =========================================================
   GET MTC CERTIFICATE LIST
========================================================= */

const getMtcCertificates = async (
  req,
  res
) => {
  try {
    const filters = {
      companyName:
        req.query.companyName || "",

      grade: req.query.grade || "",

      mtcProvider:
        req.query.mtcProvider ||
        req.query.provider ||
        "",

      fromDate:
        req.query.fromDate || "",

      toDate:
        req.query.toDate || "",

      limit: req.query.limit,
    };

    const mtcList =
      await mtcService.getMtcCertificates(
        filters
      );

    return res.status(200).json({
      success: true,
      data: mtcList,
    });
  } catch (error) {
    console.log(
      "GET MTC LIST ERROR =>",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Unable to load MTC certificates",
    });
  }
};

/* =========================================================
   GET PROVIDER-SPECIFIC CHEMICAL SPECS
========================================================= */

const getMtcChemicalSpecs = async (
  req,
  res
) => {
  try {
    const provider =
      req.query.mtcProvider ||
      req.query.provider ||
      "gloria";

    const specs =
      await mtcService.getMtcChemicalSpecs(
        provider
      );

    return res.status(200).json({
      success: true,
      data: specs,
    });
  } catch (error) {
    console.log(
      "GET MTC CHEMICAL SPECS ERROR =>",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Unable to load chemical specifications",
    });
  }
};

/* =========================================================
   GET CONFIGURED MTC PROVIDERS
========================================================= */

const getMtcProviders = async (
  req,
  res
) => {
  try {
    const providers =
      await mtcService.getMtcProviders();

    return res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    console.log(
      "GET MTC PROVIDERS ERROR =>",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Unable to load MTC providers",
    });
  }
};

/* =========================================================
   REGENERATE MTC PDF
========================================================= */

const regenerateMtcPdf = async (
  req,
  res
) => {
  try {
    const provider =
      req.body?.mtcProvider ||
      req.query.mtcProvider ||
      req.query.provider ||
      "";

    const mtc =
      await mtcService.regenerateMtcPdf(
        req.params.id,
        provider
      );

    return res.status(200).json({
      success: true,
      message:
        "MTC PDF regenerated successfully",
      data: mtc,
    });
  } catch (error) {
    console.log(
      "REGENERATE MTC PDF ERROR =>",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Unable to regenerate MTC PDF",
    });
  }
};

module.exports = {
  createMtcCertificate,
  getMtcCertificates,
  getMtcChemicalSpecs,
  getMtcProviders,
  downloadMtcPdf,
  regenerateMtcPdf,
};
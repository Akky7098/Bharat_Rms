const fs = require("fs");
const mongoose = require("mongoose");

const PdfDocument = require(
  "../model/pdfDocumentModel"
);

const {
  generatePdfByDocumentType,
} = require(
  "../services/pdfGenerationService"
);


/* =========================================================
   AUTH USER HELPERS

   Handles common authMiddleware user formats.
========================================================= */

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
};


const getUserName = (req) => {
  return (
    req.user?.name ||
    req.user?.fullName ||
    req.user?.username ||
    ""
  );
};


/* =========================================================
   VALID OBJECT ID
========================================================= */

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(
    id
  );
};


/* =========================================================
   GENERATE DOCUMENT NUMBER

   Current:

   Price Contract:
   PC-2026-XXXXXXXX

   We intentionally avoid countDocuments() because
   simultaneous requests can produce the same number.

   Timestamp suffix is safer.
========================================================= */

const generateDocumentNumber = (
  documentType
) => {
  const year =
    new Date().getFullYear();

  const suffix =
    Date.now()
      .toString()
      .slice(-8);


  switch (documentType) {

    case "price_contract":

      return `PC-${year}-${suffix}`;


    default:

      return `PDF-${year}-${suffix}`;
  }
};


/* =========================================================
   DOCUMENT TITLE
========================================================= */

const getDocumentTitle = (
  documentType
) => {
  switch (documentType) {

    case "price_contract":

      return "Price Contract";


    default:

      return "PDF Document";
  }
};


/* =========================================================
   CREATE PDF DOCUMENT

   POST /api/pdf-documents/create

   This creates the database record as DRAFT.

   PDF is generated separately through:

   POST /api/pdf-documents/:id/generate-pdf
========================================================= */

const createPdfDocument = async (
  req,
  res,
  next
) => {
  try {
    const body =
      req.body || {};


    const documentType =
      String(
        body.documentType ||
        "price_contract"
      )
        .trim()
        .toLowerCase();


    /* =====================================================
       CURRENT SUPPORTED DOCUMENTS
    ===================================================== */

    const supportedTypes = [
      "price_contract",
    ];


    if (
      !supportedTypes.includes(
        documentType
      )
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Unsupported PDF document type.",
        });
    }


    const formData =
      body.formData &&
      typeof body.formData ===
        "object"
        ? body.formData
        : {};


    const customerName =
      body.customerName ||
      formData.customerName ||
      formData.companyName ||
      "";


    const companyName =
      body.companyName ||
      formData.companyName ||
      customerName ||
      "";


    /* =====================================================
       CREATE
    ===================================================== */

    const document =
      await PdfDocument.create({
        documentType,

        documentTitle:
          body.documentTitle ||
          getDocumentTitle(
            documentType
          ),

        documentNumber:
          body.documentNumber ||
          generateDocumentNumber(
            documentType
          ),

        customerName,

        companyName,

        referenceNumber:
          body.referenceNumber ||
          "",

        formData,

        status:
          "draft",

        revisionCount:
          0,

        remark:
          body.remark ||
          "",

        createdBy:
          getUserId(req),

        createdByName:
          getUserName(req),

        updatedBy:
          getUserId(req),

        updatedByName:
          getUserName(req),
      });


    return res
      .status(201)
      .json({
        success:
          true,

        message:
          "PDF document created successfully.",

        data:
          document,
      });

  } catch (error) {
    console.log(
      "CREATE PDF DOCUMENT ERROR =>",
      error
    );

    return next(error);
  }
};


/* =========================================================
   GENERATE PDF

   POST /api/pdf-documents/:id/generate-pdf
========================================================= */

const generatePdfDocument = async (
  req,
  res,
  next
) => {
  let newlyGeneratedPdf = null;

  try {
    const {
      id,
    } = req.params;


    if (
      !isValidObjectId(
        id
      )
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Invalid PDF document ID.",
        });
    }


    const document =
      await PdfDocument.findOne({
        _id:
          id,

        isDeleted:
          false,
      });


    if (!document) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            "PDF document not found.",
        });
    }


    /* =====================================================
       IF PDF ALREADY EXISTS

       New generation = new revision.
    ===================================================== */

    if (
      document.pdf?.generated
    ) {
      document.revisionCount =
        Number(
          document.revisionCount || 0
        ) + 1;
    }


    /* =====================================================
       GENERATE FILE
    ===================================================== */

    newlyGeneratedPdf =
      await generatePdfByDocumentType(
        document
      );


    /* =====================================================
       OPTIONAL OLD FILE CLEANUP

       We remove the previous generated PDF only AFTER
       the new PDF has generated successfully.
    ===================================================== */

    const oldPdfPath =
      document.pdf?.filePath ||
      "";


    if (
      oldPdfPath &&
      oldPdfPath !==
        newlyGeneratedPdf.filePath &&
      fs.existsSync(
        oldPdfPath
      )
    ) {
      try {
        fs.unlinkSync(
          oldPdfPath
        );

        console.log(
          "OLD PDF REMOVED =>",
          oldPdfPath
        );

      } catch (cleanupError) {
        console.log(
          "OLD PDF CLEANUP SKIPPED =>",
          cleanupError.message
        );
      }
    }


    /* =====================================================
       UPDATE DATABASE
    ===================================================== */

    document.pdf = {
      generated:
        true,

      fileName:
        newlyGeneratedPdf.fileName,

      filePath:
        newlyGeneratedPdf.filePath,

      fileUrl:
        newlyGeneratedPdf.fileUrl,

      fileSize:
        newlyGeneratedPdf.fileSize || 0,

      generatedAt:
        newlyGeneratedPdf.generatedAt,

      revisionNo:
        document.revisionCount,
    };


    document.status =
      document.revisionCount > 0
        ? "revised"
        : "generated";


    document.updatedBy =
      getUserId(req);


    document.updatedByName =
      getUserName(req);


    await document.save();


    return res
      .status(200)
      .json({
        success:
          true,

        message:
          "PDF generated successfully.",

        data:
          document,

        pdf:
          document.pdf,
      });

  } catch (error) {
    console.log(
      "GENERATE PDF DOCUMENT ERROR =>",
      error
    );


    /*
     * If PDF generated but database update failed,
     * remove the orphan file.
     */

    if (
      newlyGeneratedPdf?.filePath &&
      fs.existsSync(
        newlyGeneratedPdf.filePath
      )
    ) {
      try {
        fs.unlinkSync(
          newlyGeneratedPdf.filePath
        );
      } catch (
        cleanupError
      ) {
        console.log(
          "ORPHAN PDF CLEANUP FAILED =>",
          cleanupError.message
        );
      }
    }


    return next(error);
  }
};


/* =========================================================
   GET ALL

   GET /api/pdf-documents

   Query examples:

   ?documentType=price_contract
   ?status=generated
   ?search=abc
   ?page=1
   ?limit=20
========================================================= */

const getAllPdfDocuments = async (
  req,
  res,
  next
) => {
  try {
    const {
      documentType,
      status,
      search,
    } = req.query;


    const page =
      Math.max(
        Number(
          req.query.page
        ) || 1,
        1
      );


    const limit =
      Math.min(
        Math.max(
          Number(
            req.query.limit
          ) || 20,
          1
        ),
        100
      );


    const query = {
      isDeleted:
        false,
    };


    if (documentType) {
      query.documentType =
        String(
          documentType
        )
          .trim()
          .toLowerCase();
    }


    if (status) {
      query.status =
        status;
    }


    if (
      search &&
      String(search).trim()
    ) {
      const searchRegex =
        new RegExp(
          String(search)
            .trim()
            .replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            ),
          "i"
        );


      query.$or = [
        {
          customerName:
            searchRegex,
        },

        {
          companyName:
            searchRegex,
        },

        {
          documentNumber:
            searchRegex,
        },

        {
          referenceNumber:
            searchRegex,
        },
      ];
    }


    const [
      documents,
      total,
    ] =
      await Promise.all([

        PdfDocument.find(
          query
        )
          .sort({
            createdAt:
              -1,
          })
          .skip(
            (page - 1) *
              limit
          )
          .limit(
            limit
          )
          .lean(),

        PdfDocument.countDocuments(
          query
        ),
      ]);


    return res.json({
      success:
        true,

      data:
        documents,

      pagination: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    });

  } catch (error) {
    console.log(
      "GET PDF DOCUMENTS ERROR =>",
      error
    );

    return next(error);
  }
};


/* =========================================================
   GET SINGLE

   GET /api/pdf-documents/:id
========================================================= */

const getPdfDocumentById = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;


    if (
      !isValidObjectId(
        id
      )
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Invalid PDF document ID.",
        });
    }


    const document =
      await PdfDocument.findOne({
        _id:
          id,

        isDeleted:
          false,
      }).lean();


    if (!document) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            "PDF document not found.",
        });
    }


    return res.json({
      success:
        true,

      data:
        document,
    });

  } catch (error) {
    console.log(
      "GET PDF DOCUMENT ERROR =>",
      error
    );

    return next(error);
  }
};


/* =========================================================
   UPDATE / RESUBMIT

   PUT /api/pdf-documents/update/:id

   IMPORTANT:

   Updating data does NOT automatically generate PDF.

   User will click Generate PDF after updating.
========================================================= */

const updatePdfDocument = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;


    if (
      !isValidObjectId(
        id
      )
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Invalid PDF document ID.",
        });
    }


    const document =
      await PdfDocument.findOne({
        _id:
          id,

        isDeleted:
          false,
      });


    if (!document) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            "PDF document not found.",
        });
    }


    const body =
      req.body || {};


    /* =====================================================
       FORM DATA
    ===================================================== */

    if (
      body.formData &&
      typeof body.formData ===
        "object"
    ) {
      document.formData = {
        ...(
          document.formData ||
          {}
        ),

        ...body.formData,
      };


      document.markModified(
        "formData"
      );
    }


    /* =====================================================
       BASIC FIELDS
    ===================================================== */

    if (
      body.customerName !==
      undefined
    ) {
      document.customerName =
        body.customerName;
    }


    if (
      body.companyName !==
      undefined
    ) {
      document.companyName =
        body.companyName;
    }


    if (
      body.referenceNumber !==
      undefined
    ) {
      document.referenceNumber =
        body.referenceNumber;
    }


    if (
      body.remark !==
      undefined
    ) {
      document.remark =
        body.remark;
    }


    /*
     * If customerName exists only inside formData,
     * keep root searchable customerName synced.
     */

    if (
      body.formData?.customerName
    ) {
      document.customerName =
        body.formData.customerName;
    }


    if (
      body.formData?.companyName
    ) {
      document.companyName =
        body.formData.companyName;
    }


    document.updatedBy =
      getUserId(req);


    document.updatedByName =
      getUserName(req);


    await document.save();


    return res.json({
      success:
        true,

      message:
        "PDF document updated successfully.",

      data:
        document,
    });

  } catch (error) {
    console.log(
      "UPDATE PDF DOCUMENT ERROR =>",
      error
    );

    return next(error);
  }
};


/* =========================================================
   UPDATE PDF DETAILS

   Mainly available for administrative/manual use.

   PATCH /api/pdf-documents/:id/pdf
========================================================= */

const updatePdfDetails = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;


    if (
      !isValidObjectId(
        id
      )
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Invalid PDF document ID.",
        });
    }


    const document =
      await PdfDocument.findOne({
        _id:
          id,

        isDeleted:
          false,
      });


    if (!document) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            "PDF document not found.",
        });
    }


    const incomingPdf =
      req.body?.pdf ||
      req.body ||
      {};


    document.pdf = {
      ...(
        document.pdf?.toObject
          ? document.pdf.toObject()
          : document.pdf || {}
      ),

      ...incomingPdf,
    };


    document.updatedBy =
      getUserId(req);


    document.updatedByName =
      getUserName(req);


    await document.save();


    return res.json({
      success:
        true,

      message:
        "PDF details updated successfully.",

      data:
        document,
    });

  } catch (error) {
    console.log(
      "UPDATE PDF DETAILS ERROR =>",
      error
    );

    return next(error);
  }
};


/* =========================================================
   DELETE

   DELETE /api/pdf-documents/:id

   Soft delete DB record.

   We keep generated PDF file for business/audit safety.
========================================================= */

const deletePdfDocument = async (
  req,
  res,
  next
) => {
  try {
    const {
      id,
    } = req.params;


    if (
      !isValidObjectId(
        id
      )
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Invalid PDF document ID.",
        });
    }


    const document =
      await PdfDocument.findOne({
        _id:
          id,

        isDeleted:
          false,
      });


    if (!document) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            "PDF document not found.",
        });
    }


    document.isDeleted =
      true;


    document.deletedAt =
      new Date();


    document.deletedBy =
      getUserId(req);


    document.updatedBy =
      getUserId(req);


    document.updatedByName =
      getUserName(req);


    await document.save();


    return res.json({
      success:
        true,

      message:
        "PDF document deleted successfully.",
    });

  } catch (error) {
    console.log(
      "DELETE PDF DOCUMENT ERROR =>",
      error
    );

    return next(error);
  }
};


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createPdfDocument,

  generatePdfDocument,

  getAllPdfDocuments,

  getPdfDocumentById,

  updatePdfDocument,

  updatePdfDetails,

  deletePdfDocument,
};
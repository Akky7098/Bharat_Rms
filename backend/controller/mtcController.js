const mtcService = require(
  "../services/mtcService"
);

const sbeGermanyMtcService = require(
  "../services/sbeGermanyMtcService"
);

/* =========================================================
   HELPERS
========================================================= */

const normalizeProvider = (
  value = ""
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
};

const parsePayload = (
  req
) => {
  let payload =
    req.body;

  if (
    req.body?.data
  ) {
    try {
      payload =
        typeof req.body.data ===
        "string"
          ? JSON.parse(
              req.body.data
            )
          : req.body.data;
    } catch (
      error
    ) {
      const parseError =
        new Error(
          "Invalid MTC form data"
        );

      parseError.statusCode =
        400;

      throw parseError;
    }
  }

  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {
    const error =
      new Error(
        "MTC payload is required"
      );

    error.statusCode =
      400;

    throw error;
  }

  return payload;
};

const getProviderFromRequest =
  (
    req,
    payload = {}
  ) => {
    return normalizeProvider(
      payload.mtcProvider ||
        req.body
          ?.mtcProvider ||
        req.query
          ?.mtcProvider ||
        req.query
          ?.provider ||
        ""
    );
  };

const getServiceByProvider =
  (
    provider
  ) => {
    if (
      normalizeProvider(
        provider
      ) ===
      "sbe_germany"
    ) {
      return sbeGermanyMtcService;
    }

    return mtcService;
  };

/* =========================================================
   DETECT PROVIDER FROM SAVED RECORD

   Used when frontend sends only ID.
========================================================= */

const resolveServiceForExistingMtc =
  async (
    id,
    requestedProvider = ""
  ) => {
    const provider =
      normalizeProvider(
        requestedProvider
      );

    if (provider) {
      return {
        provider,

        service:
          getServiceByProvider(
            provider
          ),
      };
    }

    /*
     * Base/common MTC lookup.
     *
     * We only use normal service here
     * to discover the provider.
     *
     * No PDF generation occurs.
     */
    const existing =
      await mtcService
        .findMtcById(
          id
        );

    if (!existing) {
      throw new Error(
        "MTC certificate not found"
      );
    }

    const savedProvider =
      normalizeProvider(
        existing.mtcProvider
      );

    return {
      provider:
        savedProvider,

      service:
        getServiceByProvider(
          savedProvider
        ),
    };
  };

/* =========================================================
   CREATE
========================================================= */

const createMtcCertificate =
  async (
    req,
    res
  ) => {
    try {
      const payload =
        parsePayload(
          req
        );

      const provider =
        getProviderFromRequest(
          req,
          payload
        );

      if (!provider) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "MTC provider is required",
          });
      }

      const service =
        getServiceByProvider(
          provider
        );

      const mtc =
        await service
          .createMtcCertificate(
            {
              ...payload,

              mtcProvider:
                provider,
            },

            req.user
          );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "MTC certificate generated successfully",

          data:
            mtc,
        });
    } catch (error) {
      console.error(
        "CREATE MTC ERROR =>",
        error
      );

      return res
        .status(
          error.statusCode ||
            400
        )
        .json({
          success:
            false,

          message:
            error.message ||
            "Unable to generate MTC certificate",
        });
    }
  };

/* =========================================================
   UPDATE
========================================================= */

const updateMtcCertificate =
  async (
    req,
    res
  ) => {
    try {
      const payload =
        parsePayload(
          req
        );

      const requestedProvider =
        getProviderFromRequest(
          req,
          payload
        );

      const {
        provider,
        service,
      } =
        await resolveServiceForExistingMtc(
          req.params.id,
          requestedProvider
        );

      const mtc =
        await service
          .updateMtcCertificate(
            req.params.id,

            {
              ...payload,

              mtcProvider:
                provider,
            },

            req.user,

            provider
          );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "MTC certificate updated and PDF regenerated successfully",

          data:
            mtc,
        });
    } catch (error) {
      console.error(
        "UPDATE MTC ERROR =>",
        error
      );

      return res
        .status(
          error.statusCode ||
            400
        )
        .json({
          success:
            false,

          message:
            error.message ||
            "Unable to update MTC certificate",
        });
    }
  };

/* =========================================================
   GET SINGLE
========================================================= */

const getMtcCertificateById =
  async (
    req,
    res
  ) => {
    try {
      const requestedProvider =
        getProviderFromRequest(
          req
        );

      const {
        provider,
        service,
      } =
        await resolveServiceForExistingMtc(
          req.params.id,
          requestedProvider
        );

      const mtc =
        await service
          .getMtcCertificateById(
            req.params.id,
            provider
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data:
            mtc,
        });
    } catch (error) {
      console.error(
        "GET SINGLE MTC ERROR =>",
        error
      );

      return res
        .status(404)
        .json({
          success:
            false,

          message:
            error.message ||
            "MTC certificate not found",
        });
    }
  };

/* =========================================================
   LIST

   Common/base collection is used for list.
========================================================= */

const getMtcCertificates =
  async (
    req,
    res
  ) => {
    try {
      const filters = {
        companyName:
          req.query
            .companyName ||
          "",

        grade:
          req.query.grade ||
          "",

        mtcProvider:
          req.query
            .mtcProvider ||
          req.query
            .provider ||
          "",

        fromDate:
          req.query
            .fromDate ||
          "",

        toDate:
          req.query
            .toDate ||
          "",

        limit:
          req.query.limit,
      };

      /*
       * SBE-specific filter request.
       */
      if (
        normalizeProvider(
          filters.mtcProvider
        ) ===
        "sbe_germany"
      ) {
        const data =
          await sbeGermanyMtcService
            .getMtcCertificates(
              filters
            );

        return res
          .status(200)
          .json({
            success:
              true,

            data,
          });
      }

      const data =
        await mtcService
          .getMtcCertificates(
            filters
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      console.error(
        "GET MTC LIST ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success:
            false,

          message:
            error.message ||
            "Unable to load MTC certificates",
        });
    }
  };

/* =========================================================
   CHEMICAL SPECS / FORM CONFIG
========================================================= */

const getMtcChemicalSpecs =
  async (
    req,
    res
  ) => {
    try {
      const provider =
        normalizeProvider(
          req.query
            .mtcProvider ||
            req.query
              .provider ||
            "gloria"
        );

      const service =
        getServiceByProvider(
          provider
        );

      const data =
        await service
          .getMtcChemicalSpecs(
            provider
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      console.error(
        "GET MTC CHEMICAL SPECS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success:
            false,

          message:
            error.message ||
            "Unable to load chemical specifications",
        });
    }
  };

/* =========================================================
   PROVIDERS

   Combine providers from BOTH services.
========================================================= */

const getMtcProviders =
  async (
    req,
    res
  ) => {
    try {
      const [
        normalProviders,
        sbeProviders,
      ] =
        await Promise.all([
          mtcService
            .getMtcProviders(),

          sbeGermanyMtcService
            .getMtcProviders(),
        ]);

      const providers = [
        ...normalProviders,
        ...sbeProviders,
      ];

      return res
        .status(200)
        .json({
          success:
            true,

          data:
            providers,
        });
    } catch (error) {
      console.error(
        "GET MTC PROVIDERS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success:
            false,

          message:
            error.message ||
            "Unable to load MTC providers",
        });
    }
  };

/* =========================================================
   DOWNLOAD PDF
========================================================= */

const downloadMtcPdf =
  async (
    req,
    res
  ) => {
    try {
      const requestedProvider =
        getProviderFromRequest(
          req
        );

      const {
        provider,
        service,
      } =
        await resolveServiceForExistingMtc(
          req.params.id,
          requestedProvider
        );

      const result =
        await service
          .getMtcPdf(
            req.params.id,
            provider
          );

      return res.download(
        result.filePath,
        result.fileName,
        (error) => {
          if (error) {
            console.error(
              "MTC PDF RESPONSE ERROR =>",
              error
            );

            if (
              !res.headersSent
            ) {
              return res
                .status(500)
                .json({
                  success:
                    false,

                  message:
                    "Unable to download MTC PDF",
                });
            }
          }

          return undefined;
        }
      );
    } catch (error) {
      console.error(
        "DOWNLOAD MTC PDF ERROR =>",
        error
      );

      return res
        .status(404)
        .json({
          success:
            false,

          message:
            error.message ||
            "MTC PDF not found",
        });
    }
  };

/* =========================================================
   REGENERATE PDF
========================================================= */

const regenerateMtcPdf =
  async (
    req,
    res
  ) => {
    try {
      const requestedProvider =
        normalizeProvider(
          req.body
            ?.mtcProvider ||
            req.query
              ?.mtcProvider ||
            req.query
              ?.provider ||
            ""
        );

      const {
        provider,
        service,
      } =
        await resolveServiceForExistingMtc(
          req.params.id,
          requestedProvider
        );

      const mtc =
        await service
          .regenerateMtcPdf(
            req.params.id,
            provider
          );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "MTC PDF regenerated successfully",

          data:
            mtc,
        });
    } catch (error) {
      console.error(
        "REGENERATE MTC PDF ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success:
            false,

          message:
            error.message ||
            "Unable to regenerate MTC PDF",
        });
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createMtcCertificate,

  updateMtcCertificate,

  getMtcCertificateById,

  getMtcCertificates,

  getMtcChemicalSpecs,

  getMtcProviders,

  downloadMtcPdf,

  regenerateMtcPdf,
};
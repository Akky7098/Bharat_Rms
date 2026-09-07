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

const isSbeGermany = (
  provider
) => {
  return (
    normalizeProvider(
      provider
    ) ===
    "sbe_germany"
  );
};

/* =========================================================
   PARSE REQUEST PAYLOAD
========================================================= */

const parsePayload = (
  req
) => {
  let payload =
    req.body;

  /*
   * Supports:
   *
   * formData.append(
   *   "data",
   *   JSON.stringify(payload)
   * );
   */
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
    } catch (error) {
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

/* =========================================================
   GET PROVIDER FROM REQUEST
========================================================= */

const getProviderFromRequest =
  (
    req,
    payload = {}
  ) => {
    return normalizeProvider(
      payload?.mtcProvider ||
        req.body
          ?.mtcProvider ||
        req.query
          ?.mtcProvider ||
        req.query
          ?.provider ||
        ""
    );
  };

/* =========================================================
   GET SERVICE BY PROVIDER
========================================================= */

const getServiceByProvider =
  (
    provider
  ) => {
    if (
      isSbeGermany(
        provider
      )
    ) {
      return (
        sbeGermanyMtcService
      );
    }

    return mtcService;
  };

/* =========================================================
   RESOLVE EXISTING CERTIFICATE

   IMPORTANT:

   mtcService.findMtcById(id) is allowed to search
   the common mtccertificates collection without a provider.

   Once provider is known, correct service is selected.
========================================================= */

const resolveExistingCertificate =
  async (
    id,
    requestedProvider = ""
  ) => {
    const normalizedRequestedProvider =
      normalizeProvider(
        requestedProvider
      );

    /*
     * If frontend already supplied provider,
     * no database discovery is required.
     */
    if (
      normalizedRequestedProvider
    ) {
      return {
        provider:
          normalizedRequestedProvider,

        service:
          getServiceByProvider(
            normalizedRequestedProvider
          ),
      };
    }

    /*
     * Discover provider from shared collection.
     *
     * No PDF generation happens here.
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

    const provider =
      normalizeProvider(
        existing.mtcProvider
      );

    return {
      provider,

      service:
        getServiceByProvider(
          provider
        ),

      existing,
    };
  };

/* =========================================================
   CREATE MTC
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
   UPDATE MTC
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

      /*
       * Do NOT trust only frontend provider.
       *
       * Existing record can tell us its real provider.
       */
      const requestedProvider =
        getProviderFromRequest(
          req,
          payload
        );

      const {
        provider,
        service,
      } =
        await resolveExistingCertificate(
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
   GET SINGLE MTC
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
        await resolveExistingCertificate(
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
   GET ALL CERTIFICATES
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
          req.query
            .grade ||
          "",

        mtcProvider:
          normalizeProvider(
            req.query
              .mtcProvider ||
              req.query
                .provider ||
              ""
          ),

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

      const requestedProvider =
        filters.mtcProvider;

      const limit =
        Math.min(
          Math.max(
            Number(
              filters.limit
            ) || 200,
            1
          ),
          200
        );

      let data = [];

      /* =====================================================
         SBE GERMANY FILTER
      ===================================================== */

      if (
        requestedProvider ===
        "sbe_germany"
      ) {
        data =
          await sbeGermanyMtcService
            .getMtcCertificates({
              ...filters,

              limit,
            });
      }

      /* =====================================================
         GLORIA / BHARAT FILTER
      ===================================================== */

      else if (
        requestedProvider ===
          "gloria" ||
        requestedProvider ===
          "bharat"
      ) {
        data =
          await mtcService
            .getMtcCertificates({
              ...filters,

              limit,
            });
      }

      /* =====================================================
         NO PROVIDER FILTER

         IMPORTANT:

         Frontend default page must show:
         - Gloria
         - Bharat
         - SBE Germany

         Therefore query BOTH services.
      ===================================================== */

      else {
        const [
          normalCertificates,
          sbeCertificates,
        ] =
          await Promise.all([
            mtcService
              .getMtcCertificates({
                ...filters,

                /*
                 * Keep provider empty.
                 *
                 * mtcService handles
                 * Gloria + Bharat.
                 */
                mtcProvider:
                  "",

                limit,
              }),

            sbeGermanyMtcService
              .getMtcCertificates({
                ...filters,

                mtcProvider:
                  "sbe_germany",

                limit,
              }),
          ]);

        /*
         * Merge both service results.
         */
        data = [
          ...(
            Array.isArray(
              normalCertificates
            )
              ? normalCertificates
              : []
          ),

          ...(
            Array.isArray(
              sbeCertificates
            )
              ? sbeCertificates
              : []
          ),
        ];

        /*
         * Newest certificate first.
         *
         * Works for Gloria, Bharat
         * and SBE.
         */
        data.sort(
          (
            a,
            b
          ) => {
            const dateA =
              new Date(
                a?.createdAt ||
                a?.mtcDate ||
                0
              ).getTime();

            const dateB =
              new Date(
                b?.createdAt ||
                b?.mtcDate ||
                0
              ).getTime();

            return (
              dateB -
              dateA
            );
          }
        );

        /*
         * Apply final limit AFTER merge.
         */
        data =
          data.slice(
            0,
            limit
          );
      }

      console.log(
        "MTC LIST RESULT =>",
        {
          requestedProvider:
            requestedProvider ||
            "ALL",

          total:
            data.length,

          providers:
            data.map(
              (item) =>
                item.mtcProvider
            ),
        }
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
   GET CHEMICAL SPECS / FORM CONFIG

   IMPORTANT:

   SBE service handles only its own form config.
   Gloria/Bharat stay in normal mtcService.
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

      let data;

      if (
        isSbeGermany(
          provider
        )
      ) {
        data =
          await sbeGermanyMtcService
            .getMtcChemicalSpecs();
      } else {
        data =
          await mtcService
            .getMtcChemicalSpecs(
              provider
            );
      }

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
   GET PROVIDERS

   IMPORTANT:

   This is a GLOBAL operation.

   Do NOT call:
   sbeGermanyMtcService.getMtcProviders()

   mtcService returns ALL provider cards.
========================================================= */

const getMtcProviders =
  async (
    req,
    res
  ) => {
    try {
      const providers = [
        {
          value:
            "gloria",

          label:
            "Gloria",

          description:
            "Generate Gloria Material Test Certificate",
        },

        {
          value:
            "bharat",

          label:
            "Bharat Special Steel",

          description:
            "Generate Bharat Special Steel Test Certificate",
        },

        {
          value:
            "sbe_germany",

          label:
            "SBE Germany",

          description:
            "Generate SBE Germany Material Test Certificate",
        },
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
        .status(500)
        .json({
          success:
            false,

          message:
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
        await resolveExistingCertificate(
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
        await resolveExistingCertificate(
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
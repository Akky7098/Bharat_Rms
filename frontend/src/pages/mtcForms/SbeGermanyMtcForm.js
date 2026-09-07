import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  BadgeCheck,
  Beaker,
  Building2,
  CheckCircle2,
  FileBadge2,
  FlaskConical,
  Gauge,
  Loader2,
  PackageCheck,
  Ruler,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  createMtcCertificate,
  getMtcChemicalSpecs,
} from "../../services/mtcService";

import "../MtcForm.css";

/* =========================================================
   CONSTANTS
========================================================= */

const PROVIDER =
  "sbe_germany";

const INITIAL_FORM = {
  grade:
    "",

  customerName:
    "",

  quantity:
    "1",

  dimension:
    "",
};

/* =========================================================
   HELPERS
========================================================= */

const cleanText = (
  value
) =>
  String(
    value ??
      ""
  ).trim();

const getResponseData = (
  response
) => {
  return (
    response?.data ||
    response ||
    {}
  );
};

const normalizeGrades = (
  config
) => {
  const grades =
    Array.isArray(
      config?.grades
    )
      ? config.grades
      : [];

  return grades
    .map(
      (
        item
      ) => {
        if (
          typeof item ===
          "string"
        ) {
          return {
            value:
              item,

            label:
              item,
          };
        }

        const value =
          cleanText(
            item?.value ||
              item?.grade
          );

        if (!value) {
          return null;
        }

        return {
          value,

          label:
            item?.label ||
            value,
        };
      }
    )
    .filter(Boolean);
};

const getChemicalRows = (
  gradeData,
  config
) => {
  const composition =
    gradeData
      ?.chemicalComposition;

  if (
    Array.isArray(
      composition
    )
  ) {
    return composition;
  }

  const elements =
    Array.isArray(
      config?.elements
    )
      ? config.elements
      : [];

  return elements.map(
    (element) => ({
      element,

      result:
        "",
    })
  );
};

const displayValue = (
  value,
  fallback = "—"
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(
    value
  );
};

/* =========================================================
   COMPONENT
========================================================= */

function SbeGermanyMtcForm({
  onBack,
  onCancel,
  onCreated,
}) {
  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM
  );

  const [
    config,
    setConfig,
  ] = useState(
    null
  );

  const [
    loadingConfig,
    setLoadingConfig,
  ] = useState(
    true
  );

  const [
    saving,
    setSaving,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  const [
    success,
    setSuccess,
  ] = useState(
    ""
  );

  const [
    createdCertificate,
    setCreatedCertificate,
  ] = useState(
    null
  );

  /* =======================================================
     LOAD BACKEND CONTROLLED CONFIG
  ======================================================= */

  const loadConfig =
    useCallback(
      async () => {
        try {
          setLoadingConfig(
            true
          );

          setError(
            ""
          );

          const response =
            await getMtcChemicalSpecs(
              PROVIDER
            );

          const data =
            getResponseData(
              response
            );

          setConfig(
            data
          );

          const grades =
            normalizeGrades(
              data
            );

          /*
           * Optional:
           * Select automatically when
           * only one SBE grade exists.
           */
          if (
            grades.length ===
              1
          ) {
            setForm(
              (previous) => ({
                ...previous,

                grade:
                  previous.grade ||
                  grades[0]
                    .value,
              })
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            "LOAD SBE CONFIG ERROR =>",
            loadError
          );

          setError(
            loadError.message ||
              "Unable to load SBE Germany configuration."
          );
        } finally {
          setLoadingConfig(
            false
          );
        }
      },
      []
    );

  useEffect(
    () => {
      loadConfig();
    },
    [loadConfig]
  );

  /* =======================================================
     GRADES
  ======================================================= */

  const grades =
    useMemo(
      () =>
        normalizeGrades(
          config
        ),
      [config]
    );

  /* =======================================================
     CURRENT BACKEND GRADE CONFIG
  ======================================================= */

  const selectedGradeConfig =
    useMemo(
      () => {
        if (
          !form.grade
        ) {
          return null;
        }

        return (
          config
            ?.gradeConfigs?.[
            form.grade
          ] ||
          null
        );
      },
      [
        config,
        form.grade,
      ]
    );

  /* =======================================================
     CHEMISTRY
  ======================================================= */

  const chemicalRows =
    useMemo(
      () =>
        getChemicalRows(
          selectedGradeConfig,
          config
        ),
      [
        selectedGradeConfig,
        config,
      ]
    );

  /* =======================================================
     FIXED / CONTROLLED DATA
  ======================================================= */

  const controlledData =
    useMemo(
      () => {
        if (
          !selectedGradeConfig
        ) {
          return {};
        }

        return {
          materialCode:
            selectedGradeConfig
              .materialCode,

          materialDescription:
            selectedGradeConfig
              .materialDescription,

          execution:
            selectedGradeConfig
              .execution,

          hardnessBHN:
            selectedGradeConfig
              .hardnessBHN,

          condition:
            selectedGradeConfig
              .condition,

          position:
            selectedGradeConfig
              .position,

          quantityUnit:
            selectedGradeConfig
              .quantityUnit,

          meltingMethod:
            selectedGradeConfig
              .meltingMethod,

          castingProcess:
            selectedGradeConfig
              .castingProcess,

          materialRemark:
            selectedGradeConfig
              .materialRemark,

          ultrasonicTest:
            selectedGradeConfig
              .ultrasonicTest,

          cleanlinessRating:
            selectedGradeConfig
              .cleanlinessRating,

          meltingProcess:
            selectedGradeConfig
              .meltingProcess,

          macroMicroStructure:
            selectedGradeConfig
              .macroMicroStructure,

          /*
           * Some backends may wrap
           * these under fixedValues.
           */
          ...(
            selectedGradeConfig
              .fixedValues ||
            {}
          ),
        };
      },
      [
        selectedGradeConfig,
      ]
    );

  /* =======================================================
     INPUT
  ======================================================= */

  const handleChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setForm(
        (previous) => ({
          ...previous,

          [name]:
            value,
        })
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );
    };

  /* =======================================================
     VALIDATE
  ======================================================= */

  const validateForm =
    () => {
      if (
        !cleanText(
          form.grade
        )
      ) {
        return "Please select Grade.";
      }

      if (
        !cleanText(
          form.customerName
        )
      ) {
        return "Customer Name is required.";
      }

      if (
        !cleanText(
          form.quantity
        )
      ) {
        return "Quantity is required.";
      }

      const quantity =
        Number(
          form.quantity
        );

      if (
        Number.isNaN(
          quantity
        ) ||
        quantity <= 0
      ) {
        return "Quantity must be greater than zero.";
      }

      if (
        !cleanText(
          form.dimension
        )
      ) {
        return "Dimension is required.";
      }

      return "";
    };

  /* =======================================================
     CREATE
  ======================================================= */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      const validationError =
        validateForm();

      if (
        validationError
      ) {
        setError(
          validationError
        );

        return;
      }

      try {
        setSaving(
          true
        );

        setError(
          ""
        );

        setSuccess(
          ""
        );

        /*
         * IMPORTANT:
         *
         * Only these values are sent.
         *
         * Chemistry / hardness /
         * execution / material code /
         * generated numbers etc.
         * are NOT sent from frontend.
         */
        const payload = {
          mtcProvider:
            PROVIDER,

          grade:
            cleanText(
              form.grade
            ),

          customerName:
            cleanText(
              form.customerName
            ),

          quantity:
            cleanText(
              form.quantity
            ),

          dimension:
            cleanText(
              form.dimension
            ),
        };

        const response =
          await createMtcCertificate(
            payload
          );

        const created =
          getResponseData(
            response
          );

        setCreatedCertificate(
          created
        );

        setSuccess(
          "SBE Germany Test Certificate generated successfully."
        );

        if (
          typeof onCreated ===
          "function"
        ) {
          onCreated(
            created
          );
        }
      } catch (
        saveError
      ) {
        console.error(
          "CREATE SBE MTC ERROR =>",
          saveError
        );

        setError(
          saveError.message ||
            "Unable to create SBE Germany certificate."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loadingConfig
  ) {
    return (
      <div className="mtc-form-page">
        <div className="sbe-loading-state">
          <Loader2
            size={25}
            className="mtc-spin"
          />

          <div>
            <strong>
              Loading SBE Germany
            </strong>

            <span>
              Loading controlled
              certificate data from
              backend...
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mtc-form-page sbe-mtc-page">
      {/* ================================================
          TOPBAR
      ================================================= */}

      <div className="mtc-form-topbar">
        <button
          type="button"
          className="mtc-form-back"
          onClick={
            onBack
          }
          disabled={
            saving
          }
        >
          <ArrowLeft
            size={18}
          />

          <span className="mtc-back-text">
            Providers
          </span>
        </button>

        <div>
          <span>
            SBE Germany
          </span>

          <h2>
            Material Test Certificate
          </h2>
        </div>
      </div>

      {/* ================================================
          ERROR / SUCCESS
      ================================================= */}

      {error && (
        <div className="mtc-form-error">
          {error}
        </div>
      )}

      {success && (
        <div className="sbe-success-message">
          <CheckCircle2
            size={19}
          />

          <span>
            {success}
          </span>
        </div>
      )}

      {/* ================================================
          GENERATED DOCUMENT
      ================================================= */}

      {createdCertificate && (
        <section className="sbe-created-card">
          <div className="sbe-created-icon">
            <BadgeCheck
              size={25}
            />
          </div>

          <div className="sbe-created-content">
            <span>
              Certificate Created
            </span>

            <strong>
              {
                createdCertificate
                  .grade
              }
            </strong>

            <div className="sbe-generated-numbers">
              <div>
                <small>
                  Fertigungsauftrag
                </small>

                <strong>
                  {displayValue(
                    createdCertificate
                      .productionOrder
                  )}
                </strong>
              </div>

              <div>
                <small>
                  Kundenbestellnummer
                </small>

                <strong>
                  {displayValue(
                    createdCertificate
                      .customerPoNumber
                  )}
                </strong>
              </div>
            </div>
          </div>
        </section>
      )}

      <form
        className="mtc-premium-form"
        onSubmit={
          handleSubmit
        }
      >
        {/* ==============================================
            USER INPUT
        =============================================== */}

        <section className="mtc-form-card sbe-primary-card">
          <div className="mtc-card-title">
            <div>
              <Building2
                size={20}
              />
            </div>

            <span>
              <h3>
                Certificate Details
              </h3>

              <p>
                Only these fields
                are entered manually.
                Remaining certificate
                data is controlled by
                the backend.
              </p>
            </span>
          </div>

          <div className="mtc-form-grid">
            {/* GRADE */}

            <div className="mtc-field">
              <label htmlFor="sbe-grade">
                Grade *
              </label>

              <select
                id="sbe-grade"
                name="grade"
                value={
                  form.grade
                }
                onChange={
                  handleChange
                }
                disabled={
                  saving ||
                  Boolean(
                    createdCertificate
                  )
                }
              >
                <option value="">
                  Select Grade
                </option>

                {grades.map(
                  (
                    grade
                  ) => (
                    <option
                      key={
                        grade.value
                      }
                      value={
                        grade.value
                      }
                    >
                      {
                        grade.label
                      }
                    </option>
                  )
                )}
              </select>

              <small className="sbe-field-help">
                Grade controls chemistry,
                hardness and material
                configuration.
              </small>
            </div>

            {/* CUSTOMER */}

            <div className="mtc-field">
              <label htmlFor="sbe-customer">
                Customer Name *
              </label>

              <input
                id="sbe-customer"
                type="text"
                name="customerName"
                value={
                  form.customerName
                }
                onChange={
                  handleChange
                }
                placeholder="Enter customer name"
                disabled={
                  saving
                }
                autoComplete="off"
              />
            </div>

            {/* QUANTITY */}

            <div className="mtc-field">
              <label htmlFor="sbe-quantity">
                Quantity / Anzahl *
              </label>

              <input
                id="sbe-quantity"
                type="number"
                min="1"
                step="1"
                name="quantity"
                value={
                  form.quantity
                }
                onChange={
                  handleChange
                }
                placeholder="1"
                disabled={
                  saving
                }
              />

              <small className="sbe-field-help">
                Unit:
                {" "}
                {displayValue(
                  controlledData
                    .quantityUnit,
                  "ST"
                )}
              </small>
            </div>

            {/* DIMENSION */}

            <div className="mtc-field">
              <label htmlFor="sbe-dimension">
                Dimension /
                Abmessung *
              </label>

              <div className="mtc-input-icon">
                <Ruler
                  size={17}
                />

                <input
                  id="sbe-dimension"
                  type="text"
                  name="dimension"
                  value={
                    form.dimension
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Dia 310 mm"
                  disabled={
                    saving
                  }
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================
            GRADE CONTROLLED DATA
        =============================================== */}

        <section className="mtc-form-card">
          <div className="mtc-card-title">
            <div>
              <ShieldCheck
                size={20}
              />
            </div>

            <span>
              <h3>
                Backend Controlled
                Material Data
              </h3>

              <p>
                Automatically populated
                after grade selection.
                These values cannot be
                changed from the
                frontend.
              </p>
            </span>
          </div>

          {!form.grade ? (
            <div className="sbe-empty-config">
              <PackageCheck
                size={24}
              />

              <strong>
                Select a Grade
              </strong>

              <span>
                Backend-controlled
                material details will
                appear here.
              </span>
            </div>
          ) : (
            <div className="sbe-controlled-grid">
              <div className="sbe-readonly-item">
                <span>
                  Werkstoff /
                  Material Code
                </span>

                <strong>
                  {displayValue(
                    controlledData
                      .materialCode ||
                      form.grade
                  )}
                </strong>
              </div>

              <div className="sbe-readonly-item sbe-readonly-wide">
                <span>
                  Material Description
                </span>

                <strong>
                  {displayValue(
                    controlledData
                      .materialDescription
                  )}
                </strong>
              </div>

              <div className="sbe-readonly-item">
                <span>
                  Ausführung /
                  Execution
                </span>

                <strong>
                  {displayValue(
                    controlledData
                      .execution
                  )}
                </strong>
              </div>

              <div className="sbe-readonly-item">
                <span>
                  Hardness
                </span>

                <strong>
                  {displayValue(
                    controlledData
                      .hardnessBHN
                  )}
                </strong>
              </div>

              <div className="sbe-readonly-item">
                <span>
                  Supply Condition
                </span>

                <strong>
                  {displayValue(
                    controlledData
                      .condition
                  )}
                </strong>
              </div>

              <div className="sbe-readonly-item">
                <span>
                  Position
                </span>

                <strong>
                  {displayValue(
                    controlledData
                      .position
                  )}
                </strong>
              </div>
            </div>
          )}
        </section>

        {/* ==============================================
            CHEMISTRY
        =============================================== */}

        <section className="mtc-form-card">
          <div className="mtc-card-title">
            <div>
              <FlaskConical
                size={20}
              />
            </div>

            <span>
              <h3>
                Schmelzanalyse
              </h3>

              <p>
                Chemical composition is
                automatically populated
                from the backend grade
                configuration.
              </p>
            </span>
          </div>

          {!form.grade ? (
            <div className="sbe-empty-config">
              <Beaker
                size={24}
              />

              <strong>
                Chemistry Pending
              </strong>

              <span>
                Select Grade to load
                achieved chemistry.
              </span>
            </div>
          ) : chemicalRows.length ===
            0 ? (
            <div className="sbe-empty-config">
              <Beaker
                size={24}
              />

              <strong>
                Chemistry unavailable
              </strong>

              <span>
                No chemical composition
                was returned by the
                backend.
              </span>
            </div>
          ) : (
            <div className="sbe-chemistry-grid">
              {chemicalRows.map(
                (
                  chemical
                ) => (
                  <div
                    key={
                      chemical.element
                    }
                    className="sbe-chemical-card"
                  >
                    <strong>
                      {
                        chemical.element
                      }
                    </strong>

                    <span>
                      {displayValue(
                        chemical.result ??
                          chemical.value ??
                          chemical.achieved
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          <div className="sbe-controlled-note">
            <ShieldCheck
              size={16}
            />

            Chemical values are
            controlled by backend
            configuration and cannot
            be manually modified.
          </div>
        </section>

        {/* ==============================================
            MANUFACTURING / TEST DATA
        =============================================== */}

        <section className="mtc-form-card">
          <div className="mtc-card-title">
            <div>
              <Gauge
                size={20}
              />
            </div>

            <span>
              <h3>
                Manufacturing &
                Inspection Data
              </h3>

              <p>
                Fixed SBE Germany
                certificate values.
              </p>
            </span>
          </div>

          <div className="sbe-test-grid">
            <div className="sbe-test-item">
              <span>
                Erschmelzungsart
              </span>

              <strong>
                {displayValue(
                  controlledData
                    .meltingMethod
                )}
              </strong>
            </div>

            <div className="sbe-test-item">
              <span>
                Gießverfahren
              </span>

              <strong>
                {displayValue(
                  controlledData
                    .castingProcess
                )}
              </strong>
            </div>

            <div className="sbe-test-item">
              <span>
                Melting Process
              </span>

              <strong>
                {displayValue(
                  controlledData
                    .meltingProcess
                )}
              </strong>
            </div>

            <div className="sbe-test-item">
              <span>
                Ultrasonic Test
              </span>

              <strong>
                {displayValue(
                  controlledData
                    .ultrasonicTest
                )}
              </strong>
            </div>

            <div className="sbe-test-item">
              <span>
                Cleanliness Rating
              </span>

              <strong>
                {displayValue(
                  controlledData
                    .cleanlinessRating
                )}
              </strong>
            </div>

            <div className="sbe-test-item">
              <span>
                Macro / Micro
                Structure
              </span>

              <strong>
                {displayValue(
                  controlledData
                    .macroMicroStructure
                )}
              </strong>
            </div>

            <div className="sbe-test-item sbe-test-wide">
              <span>
                Bemerkungen
              </span>

              <strong>
                {displayValue(
                  controlledData
                    .materialRemark
                )}
              </strong>
            </div>
          </div>
        </section>

        {/* ==============================================
            GENERATED NUMBERS INFO
        =============================================== */}

        {!createdCertificate && (
          <section className="sbe-generation-info">
            <FileBadge2
              size={21}
            />

            <div>
              <strong>
                Document numbers are
                generated automatically
              </strong>

              <span>
                Fertigungsauftrag and
                Kundenbestellnummer will
                be created by the backend
                when you generate this
                certificate.
              </span>
            </div>
          </section>
        )}

        {/* ==============================================
            ACTIONS
        =============================================== */}

        <div className="mtc-form-actions">
          <button
            type="button"
            className="mtc-cancel-btn"
            onClick={
              onCancel ||
              onBack
            }
            disabled={
              saving
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="mtc-save-btn"
            disabled={
              saving ||
              !config
            }
          >
            {saving ? (
              <>
                <Loader2
                  size={17}
                  className="mtc-spin"
                />

                Generating...
              </>
            ) : (
              <>
                <Save
                  size={17}
                />

                Generate SBE TC
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SbeGermanyMtcForm;
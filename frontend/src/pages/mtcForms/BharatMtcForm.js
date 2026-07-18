import {
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Beaker,
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Gauge,
  Layers3,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import "../MtcForm.css";

import {
  createMtcCertificate,
} from "../../services/mtcService";

/* =========================================================
   CONSTANTS
========================================================= */

const CHEMICAL_ELEMENTS = [
  {
    key: "c",
    label: "C",
  },
  {
    key: "si",
    label: "Si",
  },
  {
    key: "mn",
    label: "Mn",
  },
  {
    key: "p",
    label: "P",
  },
  {
    key: "s",
    label: "S",
  },
  {
    key: "cr",
    label: "Cr",
  },
  {
    key: "mo",
    label: "Mo",
  },
  {
    key: "ni",
    label: "Ni",
  },
  {
    key: "al",
    label: "Al",
  },
  {
    key: "cu",
    label: "Cu",
  },
  {
    key: "ti",
    label: "Ti",
  },
  {
    key: "v",
    label: "V",
  },
  {
    key: "nb",
    label: "Nb",
  },
  {
    key: "b",
    label: "B",
  },
];

const HARDENABILITY_DEFAULT_DISTANCES = [
  "1.5",
  "3",
  "5",
  "7",
  "9",
  "11",
  "13",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
];

const createClientId = () => {
  return `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
};

const createEmptyItem = () => ({
  clientId: createClientId(),

  heatNo: "",
  size: "",
  noOfPcs: "",
  quantityInKgs: "",
  remarks: "-",
});

const createEmptyChemicalValues = () => {
  return CHEMICAL_ELEMENTS.reduce(
    (composition, element) => {
      composition[element.key] = "";

      return composition;
    },
    {}
  );
};

const createEmptyChemicalRow = (
  itemId
) => ({
  itemId,
  heatNo: "",
  rowLabel: "ACHIEVED",
  values:
    createEmptyChemicalValues(),
});



/*
 * Returns only the numeric part of a heat number.
 *
 * Examples:
 * BSSPL-592 => 592
 * HEAT/EN19/1025 => 1025
 */
const getHeatNumberDigits = (
  heatNo = ""
) => {
  const matches = String(
    heatNo || ""
  ).match(/\d+/g);

  if (
    !matches ||
    matches.length === 0
  ) {
    return "";
  }

  return matches[
    matches.length - 1
  ];
};

const createEmptyMechanicalResultRow = (
  itemId
) => ({
  itemId,
  heatNo: "",

  hardness: "",
  tensileStrength: "",
  yieldStrength: "",
  elongation: "",
  impactStrength: "",
});

const createEmptyInclusionRow = () => ({
  a: "",
  b: "",
  c: "",
  d: "",
});

const createHardenabilityDistances =
  () => {
    return HARDENABILITY_DEFAULT_DISTANCES.map(
      (distance) => ({
        distance,
        specMin: "",
        specMax: "",
        achieved: "",
      })
    );
  };

/* =========================================================
   INITIAL FORM
========================================================= */

const createInitialForm = () => {
  const firstItem =
    createEmptyItem();

  return {
    mtcProvider: "bharat",

    /*
     * Common/base certificate fields.
     */
    customerName: "",
    companyName: "",
    customerAddress: "",

    orderNo: "",
    poNo: "",
    invoiceNo: "",

    tcNo: "",
    issueDate: "",
    tdcNo: "N/A",

    purchaseSpecification: "",
    product: "",
    manufacturingRoute: "",

    /*
     * Initial material row.
     *
     * The same clientId connects this
     * material row with its chemical row.
     */
    items: [
      firstItem,
    ],

    /*
     * One chemical composition row
     * per material heat number.
     */
    chemicalCompositions: [
      createEmptyChemicalRow(
        firstItem.clientId
      ),
    ],

    /*
     * Mechanical properties.
     */
    /*
 * Fixed mechanical-property configuration.
 *
 * These values appear as table headings or fixed rows
 * and are not manually entered by the user.
 */
mechanicalProperties: {
  hardness: {
    heading: "HARDNESS (BHN)",

    standard:
      "IS:1608 ASTM A370 AS NORMALIZED CONDITION",

    specMin: "-",
    specMax: "-",

    sampleRemark:
      "ONLY H&T SAMPLE",
  },

  tensileStrength: {
    heading:
      "TENSILE STRENGTH",

    unit: "N/mm²",

    specMin: "-",
    specMax: "-",
  },

  yieldStrength: {
    heading:
      "YIELD STRENGTH",

    unit: "N/mm²",

    specMin: "-",
    specMax: "-",
  },

  elongation: {
    heading: "EL. (%)",

    unit: "%",

    specMin: "-",
    specMax: "-",
  },

  impactStrength: {
    heading:
      "IS:1757 IMPACT STRENGTH CHARPY V-NOTCH",

    unit: "Joules",

    specMin: "-",
    specMax: "-",
  },
},

/*
 * One actual mechanical-result row per heat number.
 */
mechanicalResults: [
  createEmptyMechanicalResultRow(
    firstItem.clientId
  ),
],

    /*
     * Raw material details.
     */
    rawMaterialDetail: {
      source: "",
      reference: "",
    },

    /*
     * Hardenability table.
     */
    hardenabilityTest: {
      standard:
        "IS: 3848, ASTM A255, SAE J406",

      distances:
        createHardenabilityDistances(),
    },

    /*
     * Ultrasonic testing.
     */
    ultrasonicTesting: {
      heading:
        "Ultrasonic Testing (As Per ASTM A388)",

      referenceStandard:
        "ASTM A388",

      acceptance:
        "4MM FBH, 2MHZ",

      probeUsed: "24MM",

      result:
        "100% SATISFACTORY",
    },

    /*
     * Gas analysis.
     */
    gasAnalysis: {
      o2: {
        required: "",
        actual: "",
      },

      n2: {
        required: "",
        actual: "",
      },

      h2: {
        required: "",
        actual: "",
      },
    },

    /*
     * Decarbonization.
     */
    depthOfDecarbonization: {
      standard:
        "IS 6396 / ASTM E1077",

      mixupTesting: "OK",

      microstructure:
        "Pearlite + Ferrite",
    },

    /*
     * Inclusion rating.
     */
    inclusionRating: {
      standard:
        "IS:4163 / ASTM E45 / JIS G0555",

      specified:
        createEmptyInclusionRow(),

      thin: {
        a: "1.5",
        b: "1.0",
        c: "0.5",
        d: "1.0",
      },

      thick: {
        a: "1.0",
        b: "0.5",
        c: "0.5",
        d: "0.5",
      },
    },

    /*
     * Grain size and macrostructure.
     */
    grainSize: {
      specified: "5-8",
      achieved: "",
    },

    macrostructure: "",

    /*
     * Physical testing.
     */
    physicalTesting: {
      sdt: "N/A",
      coldBendTest: "N/A",
      surface: "",
    },

    /*
     * Final declarations.
     */
    identificationDetail:
      "Heat No, Grade, Size has been marked on Bar. Free from bend",

    colourCode: "N/A",

    dimensionalInspection:
      "Dimensional inspection carried out as per above mentioned PO/TDS and found within limits",

    visualInspection:
      "Visual inspection carried out as per T.D.C and found satisfactory",

    resultDeclaration:
      "We hereby certify that material is free from radioactive elements, has been manufactured and inspected, and found acceptable as per customer requirement",

    preparedBy: "",
  };
};

const initialForm =
  createInitialForm();

/* =========================================================
   MAIN COMPONENT
========================================================= */

function BharatMtcForm({
  onBack,
  onCancel,
  onCreated,
}) {
  const [form, setForm] =
    useState(initialForm);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     REQUIRED FIELD VALIDATION
  ======================================================= */

  const requiredFilled =
    useMemo(() => {
      const hasValidItems =
        form.items.length > 0 &&
        form.items.every(
          (item) =>
            String(
              item.heatNo || ""
            ).trim() &&
            String(
              item.size || ""
            ).trim() &&
            String(
              item.quantityInKgs || ""
            ).trim()
        );

      return Boolean(
        String(
          form.customerName || ""
        ).trim() &&
          String(
            form.customerAddress || ""
          ).trim() &&
          String(
            form.tcNo || ""
          ).trim() &&
          form.issueDate &&
          String(
            form.purchaseSpecification ||
              ""
          ).trim() &&
          String(
            form.product || ""
          ).trim() &&
          String(
            form.manufacturingRoute ||
              ""
          ).trim() &&
          hasValidItems
      );
    }, [form]);

  /* =======================================================
     BASIC HANDLERS
  ======================================================= */

  const handleChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSectionChange = (
    section,
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,

      [section]: {
        ...previous[section],
        [field]: value,
      },
    }));
  };

  const handleDeepSectionChange = (
    section,
    subsection,
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,

      [section]: {
        ...previous[section],

        [subsection]: {
          ...previous[section][
            subsection
          ],

          [field]: value,
        },
      },
    }));
  };

  /* =======================================================
     ITEM HANDLERS
  ======================================================= */

 const handleItemChange = (
  index,
  field,
  value
) => {
  setForm((previous) => {
    const selectedItem =
      previous.items[index];

    if (!selectedItem) {
      return previous;
    }

    const updatedItems =
      previous.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item
      );

    if (field !== "heatNo") {
      return {
        ...previous,
        items: updatedItems,
      };
    }

    const updatedChemicalRows =
      previous.chemicalCompositions.map(
        (row) =>
          row.itemId ===
          selectedItem.clientId
            ? {
                ...row,
                heatNo: value,
              }
            : row
      );

    const updatedMechanicalRows =
      previous.mechanicalResults.map(
        (row) =>
          row.itemId ===
          selectedItem.clientId
            ? {
                ...row,
                heatNo: value,
              }
            : row
      );

    return {
      ...previous,

      items: updatedItems,

      chemicalCompositions:
        updatedChemicalRows,

      mechanicalResults:
        updatedMechanicalRows,
    };
  });
};

const addItem = () => {
  const newItem =
    createEmptyItem();

  setForm((previous) => ({
    ...previous,

    items: [
      ...previous.items,
      newItem,
    ],

    chemicalCompositions: [
      ...previous
        .chemicalCompositions,

      createEmptyChemicalRow(
        newItem.clientId
      ),
    ],

    mechanicalResults: [
      ...previous
        .mechanicalResults,

      createEmptyMechanicalResultRow(
        newItem.clientId
      ),
    ],
  }));
};

 const removeItem = (index) => {
  setForm((previous) => {
    if (
      previous.items.length <= 1
    ) {
      return previous;
    }

    const itemToRemove =
      previous.items[index];

    if (!itemToRemove) {
      return previous;
    }

    return {
      ...previous,

      items:
        previous.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),

      chemicalCompositions:
        previous.chemicalCompositions.filter(
          (row) =>
            row.itemId !==
            itemToRemove.clientId
        ),

      mechanicalResults:
        previous.mechanicalResults.filter(
          (row) =>
            row.itemId !==
            itemToRemove.clientId
        ),
    };
  });
};

  /* =======================================================
     CHEMISTRY HANDLER
  ======================================================= */

  const handleChemicalChange = (
  itemId,
  element,
  value
) => {
  setForm((previous) => ({
    ...previous,

    chemicalCompositions:
      previous.chemicalCompositions.map(
        (row) =>
          row.itemId === itemId
            ? {
                ...row,

                values: {
                  ...row.values,
                  [element]: value,
                },
              }
            : row
      ),
  }));
};


const handleMechanicalResultChange = (
  itemId,
  field,
  value
) => {
  setForm((previous) => ({
    ...previous,

    mechanicalResults:
      previous.mechanicalResults.map(
        (row) =>
          row.itemId === itemId
            ? {
                ...row,
                [field]: value,
              }
            : row
      ),
  }));
};
  /* =======================================================
     HARDENABILITY HANDLERS
  ======================================================= */

  const handleHardenabilityChange = (
    index,
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,

      hardenabilityTest: {
        ...previous.hardenabilityTest,

        distances:
          previous.hardenabilityTest.distances.map(
            (row, rowIndex) =>
              rowIndex === index
                ? {
                    ...row,
                    [field]: value,
                  }
                : row
          ),
      },
    }));
  };

  const addHardenabilityDistance =
    () => {
      setForm((previous) => ({
        ...previous,

        hardenabilityTest: {
          ...previous.hardenabilityTest,

          distances: [
            ...previous
              .hardenabilityTest
              .distances,

            {
              distance: "",
              specMin: "",
              specMax: "",
              achieved: "",
            },
          ],
        },
      }));
    };

  const removeHardenabilityDistance =
    (index) => {
      setForm((previous) => ({
        ...previous,

        hardenabilityTest: {
          ...previous.hardenabilityTest,

          distances:
            previous.hardenabilityTest.distances.filter(
              (_, rowIndex) =>
                rowIndex !== index
            ),
        },
      }));
    };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    try {
      setError("");

      if (!requiredFilled) {
        setError(
          "Please fill all required Bharat TC details and complete every material item row."
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      setSaving(true);

      /*
       * Service normalizer derives:
       *
       * mtcDate => issueDate
       * grade => purchaseSpecification
       * heatLotNo => first item heatNo
       * size => first item size
       * weight => first item quantityInKgs
       */
      const payload = {
  ...form,

  items: form.items.map(
    ({
      clientId,
      ...item
    }) => item
  ),

 chemicalCompositions:
  form.chemicalCompositions.map(
    (row) => ({
      heatNo: row.heatNo,

      rowLabel:
        "ACHIEVED",

      values: {
        ...row.values,
      },
    })
  ),

mechanicalResults:
  form.mechanicalResults.map(
    (row, index) => {
      const linkedItem =
        form.items.find(
          (item) =>
            item.clientId ===
            row.itemId
        );

      const heatNo =
        row.heatNo ||
        linkedItem?.heatNo ||
        "";

      const heatDigits =
        getHeatNumberDigits(
          heatNo
        );

      return {
        heatNo,

        rowLabel:
          form.mechanicalResults
            .length === 1
            ? "ACHIEVED"
            : `ACTUAL${
                heatDigits
                  ? ` (${heatDigits})`
                  : ` (${index + 1})`
              }`,

        hardness:
          row.hardness || "-",

        tensileStrength:
          row.tensileStrength ||
          "-",

        yieldStrength:
          row.yieldStrength || "-",

        elongation:
          row.elongation || "-",

        impactStrength:
          row.impactStrength ||
          "-",
      };
    }
  ),
};

delete payload
  .bharatChemicalComposition;

const response =
  await createMtcCertificate(
    payload
  );

      if (onCreated) {
        onCreated(
          response?.data
        );
      }
    } catch (submitError) {
      setError(
        submitError?.response?.data
          ?.message ||
          submitError?.message ||
          "Failed to generate Bharat TC."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mtc-form-page">
      <div className="mtc-form-topbar">
        <button
          type="button"
          className="mtc-form-back"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Providers
        </button>

        <div>
          <span>
            Bharat Special Steel
          </span>

          <h2>
            New Bharat Material Test
            Certificate
          </h2>
        </div>
      </div>

      {error && (
        <div className="mtc-form-error">
          {error}
        </div>
      )}

      <form
        className="mtc-premium-form"
        onSubmit={handleSubmit}
      >
        {/* =================================================
            HEADER AND CUSTOMER DETAILS
        ================================================= */}

        <FormSection
          icon={
            <Building2 size={20} />
          }
          title="Certificate Details"
          subtitle="Enter customer, order, invoice and certificate information."
        >
          <div className="mtc-form-grid">
            <FormField
              label="TC Provider"
              value="Bharat Special Steel"
              disabled
            />

            <FormField
              label="Customer Name"
              required
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              placeholder="Customer name"
            />

            <FormField
              label="Company Name"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              placeholder="Company name"
            />

            <FormField
              label="Customer Address"
              required
              name="customerAddress"
              value={
                form.customerAddress
              }
              onChange={handleChange}
              placeholder="Complete customer address"
              multiline
              fullWidth
            />

            <FormField
              label="TC Number"
              required
              name="tcNo"
              value={form.tcNo}
              onChange={handleChange}
              placeholder="BSS/26-27/102"
            />

            <div className="mtc-field">
              <label>
                Issue Date *
              </label>

              <div className="mtc-input-icon">
                <Calendar size={16} />

                <input
                  type="date"
                  name="issueDate"
                  value={form.issueDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <FormField
              label="TDC Number"
              name="tdcNo"
              value={form.tdcNo}
              onChange={handleChange}
              placeholder="N/A"
            />

            <FormField
              label="Invoice Number"
              name="invoiceNo"
              value={form.invoiceNo}
              onChange={handleChange}
              placeholder="Invoice number"
            />

            <FormField
              label="Order Number"
              name="orderNo"
              value={form.orderNo}
              onChange={handleChange}
              placeholder="Sales order number"
            />

            <FormField
              label="PO Number"
              name="poNo"
              value={form.poNo}
              onChange={handleChange}
              placeholder="Customer PO number"
            />

            <FormField
              label="Purchase Specification"
              required
              name="purchaseSpecification"
              value={
                form.purchaseSpecification
              }
              onChange={handleChange}
              placeholder="EN19"
            />

            <FormField
              label="Product"
              required
              name="product"
              value={form.product}
              onChange={handleChange}
              placeholder="ROUND BAR"
            />

            <FormField
              label="Manufacturing Route"
              required
              name="manufacturingRoute"
              value={
                form.manufacturingRoute
              }
              onChange={handleChange}
              placeholder="AS ROLLED"
            />
          </div>
        </FormSection>

        {/* =================================================
            MATERIAL ITEMS
        ================================================= */}

        <FormSection
          icon={<Layers3 size={20} />}
          title="Item Description"
          subtitle="Add one row for every heat number, size and quantity."
        >
          <div className="bharat-mtc-items">
            {form.items.map(
              (item, index) => (
                <div
                  className="bharat-mtc-item-card"
                  key={`bharat-item-${index}`}
                >
                  <div className="bharat-mtc-item-head">
                    <strong>
                      Material Row{" "}
                      {index + 1}
                    </strong>

                    <button
                      type="button"
                      aria-label={`Remove material row ${
                        index + 1
                      }`}
                      onClick={() =>
                        removeItem(index)
                      }
                      disabled={
                        form.items.length ===
                        1
                      }
                    >
                      <Trash2
                        size={15}
                      />
                    </button>
                  </div>

                  <div className="mtc-form-grid">
                    <FormField
                      label="Heat Number"
                      required
                      value={
                        item.heatNo
                      }
                      onChange={(
                        event
                      ) =>
                        handleItemChange(
                          index,
                          "heatNo",
                          event.target
                            .value
                        )
                      }
                      placeholder="BSSPL-592"
                    />

                    <FormField
                      label="Size"
                      required
                      value={item.size}
                      onChange={(
                        event
                      ) =>
                        handleItemChange(
                          index,
                          "size",
                          event.target
                            .value
                        )
                      }
                      placeholder="Ø 110 MM"
                    />

                    <FormField
                      label="Number of Pieces"
                      value={
                        item.noOfPcs
                      }
                      onChange={(
                        event
                      ) =>
                        handleItemChange(
                          index,
                          "noOfPcs",
                          event.target
                            .value
                        )
                      }
                      placeholder="-"
                    />

                    <FormField
                      label="Quantity in Kgs"
                      required
                      value={
                        item.quantityInKgs
                      }
                      onChange={(
                        event
                      ) =>
                        handleItemChange(
                          index,
                          "quantityInKgs",
                          event.target
                            .value
                        )
                      }
                      placeholder="589.500 KGS"
                    />

                    <FormField
                      label="Remarks"
                      value={
                        item.remarks
                      }
                      onChange={(
                        event
                      ) =>
                        handleItemChange(
                          index,
                          "remarks",
                          event.target
                            .value
                        )
                      }
                      placeholder="-"
                    />
                  </div>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            className="bharat-mtc-add-item"
            onClick={addItem}
          >
            <Plus size={16} />
            Add Material Row
          </button>
        </FormSection>

        {/* =================================================
            CHEMICAL COMPOSITION
        ================================================= */}

       <FormSection
  icon={
    <FlaskConical size={20} />
  }
  title="Chemical Composition"
  subtitle="One achieved chemical-composition row is generated automatically for every material heat number."
>
  <div className="bharat-chemistry-table-wrap">
    <table className="bharat-chemistry-table">
      <thead>
        <tr>
          <th>SPEC</th>
          <th>RESULT</th>

          {CHEMICAL_ELEMENTS.map(
            (element) => (
              <th key={element.key}>
                {element.label}
              </th>
            )
          )}
        </tr>
      </thead>

      <tbody>
        {form.chemicalCompositions.map(
          (chemicalRow, rowIndex) => (
            <tr
              key={
                chemicalRow.itemId
              }
            >
              <th>
                <input
                  className="bharat-chemistry-heat-input"
                  value={
                    chemicalRow.heatNo ||
                    form.items.find(
                      (item) =>
                        item.clientId ===
                        chemicalRow.itemId
                    )?.heatNo ||
                    ""
                  }
                  disabled
                  placeholder={`Heat ${
                    rowIndex + 1
                  }`}
                />
              </th>

              <th>
                <span className="bharat-chemistry-achieved-label">
                  ACHIEVED
                </span>
              </th>

              {CHEMICAL_ELEMENTS.map(
                (element) => (
                  <td
                    key={`${chemicalRow.itemId}-${element.key}`}
                  >
                    <input
                      value={
                        chemicalRow
                          .values[
                          element.key
                        ] || ""
                      }
                      onChange={(
                        event
                      ) =>
                        handleChemicalChange(
                          chemicalRow.itemId,
                          element.key,
                          event.target.value
                        )
                      }
                      placeholder="-"
                    />
                  </td>
                )
              )}
            </tr>
          )
        )}
      </tbody>
    </table>
  </div>

  <div className="mtc-note">
    Heat numbers are taken
    automatically from Item
    Description. Add or remove
    material rows to add or remove
    chemical-composition rows.
  </div>
</FormSection>

        {/* =================================================
            MECHANICAL PROPERTIES
        ================================================= */}

        <FormSection
  icon={<Gauge size={20} />}
  title="Mechanical Properties"
  subtitle="Fixed specifications are shown automatically. Enter actual values heat-wise."
>
  <div className="bharat-mechanical-table-wrap">
    <table className="bharat-mechanical-table">
      <thead>
        <tr>
          <th>
            HARDNESS
            <small>(BHN)</small>
          </th>

          <th>
            {
              form
                .mechanicalProperties
                .hardness.standard
            }
          </th>

          <th>
            TENSILE STRENGTH
            <small>N/mm²</small>
          </th>

          <th>
            YIELD STRENGTH
            <small>N/mm²</small>
          </th>

          <th>
            EL. (%)
          </th>

          <th>
            IS:1757 IMPACT STRENGTH
            CHARPY V-NOTCH
            <small>Joules</small>
          </th>
        </tr>
      </thead>

      <tbody>
        {/* Fixed specification row */}
        <tr>
          <th>SPEC MIN</th>

          <td>
            {
              form
                .mechanicalProperties
                .hardness.specMin
            }
          </td>

          <td>
            {
              form
                .mechanicalProperties
                .tensileStrength
                .specMin
            }
          </td>

          <td>
            {
              form
                .mechanicalProperties
                .yieldStrength
                .specMin
            }
          </td>

          <td>
            {
              form
                .mechanicalProperties
                .elongation.specMin
            }
          </td>

          <td>
            {
              form
                .mechanicalProperties
                .impactStrength
                .specMin
            }
          </td>
        </tr>

        {/* Fixed maximum row */}
        <tr>
          <th>SPEC MAX</th>

          <td>
            {
              form
                .mechanicalProperties
                .hardness.specMax
            }
          </td>

          <td>
            {
              form
                .mechanicalProperties
                .tensileStrength
                .specMax
            }
          </td>

          <td>
            {
              form
                .mechanicalProperties
                .yieldStrength
                .specMax
            }
          </td>

          <td>
            {
              form
                .mechanicalProperties
                .elongation.specMax
            }
          </td>

          <td>
            {
              form
                .mechanicalProperties
                .impactStrength
                .specMax
            }
          </td>
        </tr>

        {/* Fixed H&T sample row */}
        <tr>
          <th>REMARK</th>

          <td>
            <span className="bharat-fixed-value">
              {
                form
                  .mechanicalProperties
                  .hardness
                  .sampleRemark
              }
            </span>
          </td>

          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
        </tr>

        {/* One actual result row per heat */}
        {form.mechanicalResults.map(
          (resultRow, index) => {
            const linkedItem =
              form.items.find(
                (item) =>
                  item.clientId ===
                  resultRow.itemId
              );

            const heatNo =
              resultRow.heatNo ||
              linkedItem?.heatNo ||
              "";

            const heatDigits =
              getHeatNumberDigits(
                heatNo
              );

            const actualLabel =
              form.mechanicalResults
                .length === 1
                ? "ACHIEVED"
                : `ACTUAL${
                    heatDigits
                      ? ` (${heatDigits})`
                      : ` (${index + 1})`
                  }`;

            return (
              <tr
                key={
                  resultRow.itemId
                }
              >
                <th>
                  <div className="bharat-mechanical-result-label">
                    <strong>
                      {actualLabel}
                    </strong>

                    <small>
                      {heatNo ||
                        `Heat ${
                          index + 1
                        }`}
                    </small>
                  </div>
                </th>

                <td>
                  <input
                    value={
                      resultRow.hardness
                    }
                    onChange={(
                      event
                    ) =>
                      handleMechanicalResultChange(
                        resultRow.itemId,
                        "hardness",
                        event.target
                          .value
                      )
                    }
                    placeholder="-"
                  />
                </td>

                <td>
                  <input
                    value={
                      resultRow
                        .tensileStrength
                    }
                    onChange={(
                      event
                    ) =>
                      handleMechanicalResultChange(
                        resultRow.itemId,
                        "tensileStrength",
                        event.target
                          .value
                      )
                    }
                    placeholder="-"
                  />
                </td>

                <td>
                  <input
                    value={
                      resultRow
                        .yieldStrength
                    }
                    onChange={(
                      event
                    ) =>
                      handleMechanicalResultChange(
                        resultRow.itemId,
                        "yieldStrength",
                        event.target
                          .value
                      )
                    }
                    placeholder="-"
                  />
                </td>

                <td>
                  <input
                    value={
                      resultRow.elongation
                    }
                    onChange={(
                      event
                    ) =>
                      handleMechanicalResultChange(
                        resultRow.itemId,
                        "elongation",
                        event.target
                          .value
                      )
                    }
                    placeholder="-"
                  />
                </td>

                <td>
                  <input
                    value={
                      resultRow
                        .impactStrength
                    }
                    onChange={(
                      event
                    ) =>
                      handleMechanicalResultChange(
                        resultRow.itemId,
                        "impactStrength",
                        event.target
                          .value
                      )
                    }
                    placeholder="-"
                  />
                </td>
              </tr>
            );
          }
        )}
      </tbody>
    </table>
  </div>

  <div className="mtc-note">
    Specification minimum,
    specification maximum, test
    standards, units and ONLY H&amp;T
    SAMPLE are fixed. Enter only the
    actual test result for each heat
    number.
  </div>
</FormSection>

        {/* =================================================
            RAW MATERIAL AND HARDENABILITY
        ================================================= */}

        <FormSection
          icon={<Beaker size={20} />}
          title="Raw Material and Hardenability"
          subtitle="Enter source details and Jominy hardenability values."
        >
          <div className="mtc-form-grid">
            <FormField
              label="Raw Material Source"
              value={
                form.rawMaterialDetail
                  .source
              }
              onChange={(event) =>
                handleSectionChange(
                  "rawMaterialDetail",
                  "source",
                  event.target.value
                )
              }
              placeholder="Raw material source"
            />

            <FormField
              label="Raw Material Reference"
              value={
                form.rawMaterialDetail
                  .reference
              }
              onChange={(event) =>
                handleSectionChange(
                  "rawMaterialDetail",
                  "reference",
                  event.target.value
                )
              }
              placeholder="Reference"
            />

            <FormField
              label="Hardenability Standard"
              value={
                form.hardenabilityTest
                  .standard
              }
              onChange={(event) =>
                handleSectionChange(
                  "hardenabilityTest",
                  "standard",
                  event.target.value
                )
              }
              fullWidth
            />
          </div>

          <div className="bharat-hardenability-table-wrap">
            <table className="bharat-hardenability-table">
              <thead>
                <tr>
                  <th>Distance</th>
                  <th>Spec Min</th>
                  <th>Spec Max</th>
                  <th>Achieved</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {form.hardenabilityTest.distances.map(
                  (row, index) => (
                    <tr
                      key={`hardenability-${index}`}
                    >
                      <td>
                        <input
                          value={
                            row.distance
                          }
                          onChange={(
                            event
                          ) =>
                            handleHardenabilityChange(
                              index,
                              "distance",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Distance"
                        />
                      </td>

                      <td>
                        <input
                          value={
                            row.specMin
                          }
                          onChange={(
                            event
                          ) =>
                            handleHardenabilityChange(
                              index,
                              "specMin",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="-"
                        />
                      </td>

                      <td>
                        <input
                          value={
                            row.specMax
                          }
                          onChange={(
                            event
                          ) =>
                            handleHardenabilityChange(
                              index,
                              "specMax",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="-"
                        />
                      </td>

                      <td>
                        <input
                          value={
                            row.achieved
                          }
                          onChange={(
                            event
                          ) =>
                            handleHardenabilityChange(
                              index,
                              "achieved",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="-"
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="bharat-inline-delete-btn"
                          onClick={() =>
                            removeHardenabilityDistance(
                              index
                            )
                          }
                        >
                          <Trash2
                            size={15}
                          />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="bharat-mtc-add-item"
            onClick={
              addHardenabilityDistance
            }
          >
            <Plus size={16} />
            Add Distance
          </button>
        </FormSection>

        {/* =================================================
            ULTRASONIC AND GAS ANALYSIS
        ================================================= */}

        <FormSection
          icon={
            <ClipboardCheck
              size={20}
            />
          }
          title="Ultrasonic and Gas Analysis"
          subtitle="Enter ultrasonic test conditions and gas analysis values."
        >
          <div className="bharat-mtc-subsection">
            <h4>
              Ultrasonic Testing
            </h4>

            <div className="mtc-form-grid">
              {[
                {
                  field: "heading",
                  label: "Heading",
                },
                {
                  field:
                    "referenceStandard",
                  label:
                    "Reference Standard",
                },
                {
                  field: "acceptance",
                  label: "Acceptance",
                },
                {
                  field: "probeUsed",
                  label: "Probe Used",
                },
                {
                  field: "result",
                  label: "Result",
                },
              ].map((item) => (
                <FormField
                  key={item.field}
                  label={item.label}
                  value={
                    form
                      .ultrasonicTesting[
                      item.field
                    ]
                  }
                  onChange={(
                    event
                  ) =>
                    handleSectionChange(
                      "ultrasonicTesting",
                      item.field,
                      event.target.value
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div className="bharat-mtc-subsection">
            <h4>Gas Analysis</h4>

            <div className="bharat-gas-grid">
              {[
                {
                  key: "o2",
                  label: "O₂ (PPM)",
                },
                {
                  key: "n2",
                  label: "N₂ (PPM)",
                },
                {
                  key: "h2",
                  label: "H₂ (PPM)",
                },
              ].map((gas) => (
                <div
                  className="bharat-mtc-test-card"
                  key={gas.key}
                >
                  <strong>
                    {gas.label}
                  </strong>

                  <div className="mtc-form-grid">
                    <FormField
                      label="Required"
                      value={
                        form
                          .gasAnalysis[
                          gas.key
                        ].required
                      }
                      onChange={(
                        event
                      ) =>
                        handleDeepSectionChange(
                          "gasAnalysis",
                          gas.key,
                          "required",
                          event.target
                            .value
                        )
                      }
                      placeholder="-"
                    />

                    <FormField
                      label="Actual"
                      value={
                        form
                          .gasAnalysis[
                          gas.key
                        ].actual
                      }
                      onChange={(
                        event
                      ) =>
                        handleDeepSectionChange(
                          "gasAnalysis",
                          gas.key,
                          "actual",
                          event.target
                            .value
                        )
                      }
                      placeholder="-"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FormSection>

        {/* =================================================
            DECARBONIZATION AND INCLUSION
        ================================================= */}

        <FormSection
          icon={<Layers3 size={20} />}
          title="Metallurgical Examination"
          subtitle="Enter decarbonization, inclusion rating, grain size and macrostructure values."
        >
          <div className="bharat-mtc-subsection">
            <h4>
              Depth of Decarbonization
            </h4>

            <div className="mtc-form-grid">
              <FormField
                label="Standard"
                value={
                  form
                    .depthOfDecarbonization
                    .standard
                }
                onChange={(
                  event
                ) =>
                  handleSectionChange(
                    "depthOfDecarbonization",
                    "standard",
                    event.target.value
                  )
                }
              />

              <FormField
                label="Mix-up Testing"
                value={
                  form
                    .depthOfDecarbonization
                    .mixupTesting
                }
                onChange={(
                  event
                ) =>
                  handleSectionChange(
                    "depthOfDecarbonization",
                    "mixupTesting",
                    event.target.value
                  )
                }
              />

              <FormField
                label="Microstructure"
                value={
                  form
                    .depthOfDecarbonization
                    .microstructure
                }
                onChange={(
                  event
                ) =>
                  handleSectionChange(
                    "depthOfDecarbonization",
                    "microstructure",
                    event.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="bharat-mtc-subsection">
            <h4>Inclusion Rating</h4>

            <FormField
              label="Standard"
              value={
                form.inclusionRating
                  .standard
              }
              onChange={(event) =>
                handleSectionChange(
                  "inclusionRating",
                  "standard",
                  event.target.value
                )
              }
            />

            <div className="bharat-inclusion-table-wrap">
              <table className="bharat-inclusion-table">
                <thead>
                  <tr>
                    <th>Rating</th>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                    <th>D</th>
                  </tr>
                </thead>

                <tbody>
                  {[
                    {
                      key: "specified",
                      label: "Specified",
                    },
                    {
                      key: "thin",
                      label: "Thin",
                    },
                    {
                      key: "thick",
                      label: "Thick",
                    },
                  ].map((row) => (
                    <tr key={row.key}>
                      <th>
                        {row.label}
                      </th>

                      {[
                        "a",
                        "b",
                        "c",
                        "d",
                      ].map(
                        (column) => (
                          <td
                            key={`${row.key}-${column}`}
                          >
                            <input
                              value={
                                form
                                  .inclusionRating[
                                  row.key
                                ][
                                  column
                                ]
                              }
                              onChange={(
                                event
                              ) =>
                                handleDeepSectionChange(
                                  "inclusionRating",
                                  row.key,
                                  column,
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder="-"
                            />
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mtc-form-grid">
            <FormField
              label="Grain Size Specified"
              value={
                form.grainSize
                  .specified
              }
              onChange={(event) =>
                handleSectionChange(
                  "grainSize",
                  "specified",
                  event.target.value
                )
              }
              placeholder="5-8"
            />

            <FormField
              label="Grain Size Achieved"
              value={
                form.grainSize
                  .achieved
              }
              onChange={(event) =>
                handleSectionChange(
                  "grainSize",
                  "achieved",
                  event.target.value
                )
              }
              placeholder="6"
            />

            <FormField
              label="Macrostructure"
              name="macrostructure"
              value={
                form.macrostructure
              }
              onChange={handleChange}
              placeholder="C2R2S2"
            />
          </div>
        </FormSection>

        {/* =================================================
            PHYSICAL TESTING
        ================================================= */}

        <FormSection
          icon={<Gauge size={20} />}
          title="Physical Testing"
          subtitle="Enter SDT, cold bend and surface inspection values."
        >
          <div className="mtc-form-grid">
            <FormField
              label="SDT"
              value={
                form.physicalTesting
                  .sdt
              }
              onChange={(event) =>
                handleSectionChange(
                  "physicalTesting",
                  "sdt",
                  event.target.value
                )
              }
            />

            <FormField
              label="Cold Bend Test"
              value={
                form.physicalTesting
                  .coldBendTest
              }
              onChange={(event) =>
                handleSectionChange(
                  "physicalTesting",
                  "coldBendTest",
                  event.target.value
                )
              }
            />

            <FormField
              label="Surface"
              value={
                form.physicalTesting
                  .surface
              }
              onChange={(event) =>
                handleSectionChange(
                  "physicalTesting",
                  "surface",
                  event.target.value
                )
              }
              placeholder="-"
            />
          </div>
        </FormSection>

        {/* =================================================
            FINAL DECLARATIONS
        ================================================= */}

        <FormSection
          icon={<FileText size={20} />}
          title="Inspection and Declaration"
          subtitle="Review identification, inspection and final certificate declarations."
        >
          <div className="mtc-form-grid">
            <FormField
              label="Identification Detail"
              name="identificationDetail"
              value={
                form.identificationDetail
              }
              onChange={handleChange}
              multiline
              fullWidth
            />

            <FormField
              label="Colour Code"
              name="colourCode"
              value={form.colourCode}
              onChange={handleChange}
            />

            <FormField
              label="Prepared By"
              name="preparedBy"
              value={form.preparedBy}
              onChange={handleChange}
              placeholder="Prepared by"
            />

            <FormField
              label="Dimensional Inspection"
              name="dimensionalInspection"
              value={
                form.dimensionalInspection
              }
              onChange={handleChange}
              multiline
              fullWidth
            />

            <FormField
              label="Visual Inspection"
              name="visualInspection"
              value={
                form.visualInspection
              }
              onChange={handleChange}
              multiline
              fullWidth
            />

            <FormField
              label="Result Declaration"
              name="resultDeclaration"
              value={
                form.resultDeclaration
              }
              onChange={handleChange}
              multiline
              fullWidth
            />
          </div>
        </FormSection>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="mtc-form-actions">
          <button
            type="button"
            className="mtc-cancel-btn"
            onClick={
              onCancel || onBack
            }
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="mtc-save-btn"
            disabled={saving}
          >
            {saving ? (
              <Loader2
                className="mtc-spin"
                size={18}
              />
            ) : (
              <Save size={18} />
            )}

            {saving
              ? "Generating..."
              : "Generate Bharat TC PDF"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

function FormSection({
  icon,
  title,
  subtitle,
  children,
}) {
  return (
    <section className="mtc-form-card">
      <div className="mtc-card-title">
        <div>{icon}</div>

        <span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </span>
      </div>

      {children}
    </section>
  );
}

function FormField({
  label,
  required = false,
  fullWidth = false,
  multiline = false,
  ...inputProps
}) {
  return (
    <div
      className={`mtc-field ${
        fullWidth
          ? "mtc-field-full"
          : ""
      }`}
    >
      <label>
        {label}
        {required ? " *" : ""}
      </label>

      {multiline ? (
        <textarea
          rows={3}
          {...inputProps}
        />
      ) : (
        <input {...inputProps} />
      )}
    </div>
  );
}



export default BharatMtcForm;
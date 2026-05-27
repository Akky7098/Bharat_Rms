import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createSalesOrder,
  updateSalesOrder,
  generateSalesOrderPdf,
} from "../services/salesOrderService";
import "./SalesOrderForm.css";

const paymentTermOptions = [
  "10_percent_advance_balance_on_readiness_of_material",
  "20_percent_advance_balance_on_readiness_of_material",
  "30_percent_advance_balance_on_readiness_of_material",
  "40_percent_advance_balance_on_readiness_of_material",
  "50_percent_advance_balance_on_readiness_of_material",
  "30_days_pdc_against_invoice",
  "45_days_pdc_against_invoice",
  "60_days_pdc_against_invoice",
  "75_days_pdc_against_invoice",
  "90_days_pdc_against_invoice",
  "30_days_from_date_of_invoice",
  "45_days_from_date_of_invoice",
  "60_days_from_date_of_invoice",
  "75_days_from_date_of_invoice",
  "90_days_from_date_of_invoice",
  "30_days_from_date_of_po_received",
  "45_days_from_date_of_po_received",
  "60_days_from_date_of_po_received",
  "75_days_from_date_of_po_received",
  "90_days_from_date_of_po_received",
  "other",
];

const supplyConditionOptions = [
  { value: "as_per_standard", label: "As Per Standard" },
  { value: "as_rolled", label: "As Rolled" },
  { value: "as_forged", label: "As Forged" },
  { value: "as_rolled_or_as_forged", label: "As Rolled / As Forged" },
  { value: "as_rolled_annealed", label: "As Rolled + Annealed" },
  { value: "as_forged_annealed", label: "As Forged + Annealed" },
  {
    value: "as_rolled_or_forged_annealed",
    label: "As Rolled / Forged + Annealed",
  },
  { value: "as_rolled_normalised", label: "As Rolled + Normalised" },
  {
    value: "as_rolled_or_as_forged_normalised",
    label: "As Rolled / As Forged + Normalised",
  },
  { value: "as_rolled_qt", label: "As Rolled + QT" },
  { value: "as_forged_qt", label: "As Forged + QT" },
  {
    value: "as_rolled_or_as_forged_qt",
    label: "As Rolled / As Forged + QT",
  },
  { value: "other", label: "Others" },
];

const approverOptions = ["nilesh_sir", "jatin_sir", "mayank_sir"];

const formatLabel = (value = "") =>
  String(value).replaceAll("_", " ").toUpperCase();

const formatPaymentTermLabel = (term) => {
  const map = {
    "10_percent_advance_balance_on_readiness_of_material":
      "10% Advance, Balance on Readiness of Material",
    "20_percent_advance_balance_on_readiness_of_material":
      "20% Advance, Balance on Readiness of Material",
    "30_percent_advance_balance_on_readiness_of_material":
      "30% Advance, Balance on Readiness of Material",
    "40_percent_advance_balance_on_readiness_of_material":
      "40% Advance, Balance on Readiness of Material",
    "50_percent_advance_balance_on_readiness_of_material":
      "50% Advance, Balance on Readiness of Material",

    "30_days_pdc_against_invoice": "30 Days PDC Against Invoice",
    "45_days_pdc_against_invoice": "45 Days PDC Against Invoice",
    "60_days_pdc_against_invoice": "60 Days PDC Against Invoice",
    "75_days_pdc_against_invoice": "75 Days PDC Against Invoice",
    "90_days_pdc_against_invoice": "90 Days PDC Against Invoice",

    "30_days_from_date_of_invoice": "30 Days from Date of Invoice",
    "45_days_from_date_of_invoice": "45 Days from Date of Invoice",
    "60_days_from_date_of_invoice": "60 Days from Date of Invoice",
    "75_days_from_date_of_invoice": "75 Days from Date of Invoice",
    "90_days_from_date_of_invoice": "90 Days from Date of Invoice",

    "30_days_from_date_of_po_received": "30 Days from Date of PO Received",
    "45_days_from_date_of_po_received": "45 Days from Date of PO Received",
    "60_days_from_date_of_po_received": "60 Days from Date of PO Received",
    "75_days_from_date_of_po_received": "75 Days from Date of PO Received",
    "90_days_from_date_of_po_received": "90 Days from Date of PO Received",
    other: "Other",
  };

  return map[term] || formatLabel(term);
};

const normalizeForCompare = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/%/g, "_percent")
    .replace(/\+/g, "_")
    .replace(/\//g, "_or_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const resolveOptionValue = (value, allowedValues, fallback = "") => {
  if (value === undefined || value === null || value === "") return fallback;

  const cleanValue = String(value).trim();
  if (allowedValues.includes(cleanValue)) return cleanValue;

  const normalizedValue = normalizeForCompare(cleanValue);
  const matched = allowedValues.find(
    (option) => normalizeForCompare(option) === normalizedValue
  );

  return matched || fallback;
};

const yesNoValue = (value, fallback = "") => {
  if (value === true) return "yes";
  if (value === false) return "no";

  const clean = String(value || "").trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(clean)) return "yes";
  if (["no", "n", "false", "0"].includes(clean)) return "no";

  return fallback;
};

const boolSelectValue = (value, fallback = "true") => {
  if (value === true) return "true";
  if (value === false) return "false";

  const clean = String(value || "").trim().toLowerCase();
  if (["true", "yes", "1"].includes(clean)) return "true";
  if (["false", "no", "0"].includes(clean)) return "false";

  return fallback;
};

const supplyConditionValues = supplyConditionOptions.map((item) => item.value);

const normalizeSupplyCondition = (value) => {
  if (!value) return "as_per_standard";

  const direct = resolveOptionValue(value, supplyConditionValues, "");
  if (direct) return direct;

  const normalized = normalizeForCompare(value);
  const aliasMap = {
    as_per_standard: "as_per_standard",
    as_standard: "as_per_standard",
    as_rolled_as_forged: "as_rolled_or_as_forged",
    as_rolled_or_forged: "as_rolled_or_as_forged",
    as_rolled_forged_annealed: "as_rolled_or_forged_annealed",
    as_rolled_as_forged_annealed: "as_rolled_or_forged_annealed",
    as_rolled_forged_normalised: "as_rolled_or_as_forged_normalised",
    as_rolled_as_forged_normalised: "as_rolled_or_as_forged_normalised",
    as_rolled_forged_qt: "as_rolled_or_as_forged_qt",
    as_rolled_as_forged_qt: "as_rolled_or_as_forged_qt",
    others: "other",
  };

  return aliasMap[normalized] || "other";
};

const normalizePaymentTerm = (value) =>
  resolveOptionValue(value, paymentTermOptions, value ? "other" : "");

const normalizeCuttingCost = (value) =>
  resolveOptionValue(value, ["extra", "inclusive", "not_applicable"], "");

const normalizeFreight = (value) =>
  resolveOptionValue(value, ["extra", "self", "inclusive"], "");

const getToday = () => new Date().toISOString().split("T")[0];

const initialForm = {
  companyName: "",
  companyAddress: "",
  gstinNumber: "",

  poNumber: "",
  checklistNumber: "",

  customerType: "existing",
  customerPOFile: null,

  paymentTerms: "",
  otherPaymentTerms: "",
  orderValue: "",
  isPaymentTermsApprovedByManagement: "false",
  paymentTermsApprovedBy: "",

  previousPaymentAvailable: "",
  previousPaymentStatus: "",
  specialNote: "",

  poAsPerQuotation: "",

  billingSameAsCompany: "true",
  billingAddress: "",
  billingGstinNumber: "",

  shippingSameAsCompany: "true",
  shippingAddress: "",
  shippingGstinNumber: "",

  enquiryFormFilled: "",

  sizeGradeQuantityRate: "",
  supplyCondition: "as_per_standard",
  otherSupplyConditions: "",

  cutLengthRequired: "",
  cuttingCost: "",
  cuttingExtraCharges: "",

  freight: "",
  freightExtraCharges: "",

  tolerance: "",
  endUseOfCustomer: "",
  deliveryTime: "",
  testCertificateRequired: "yes",

  contactPersonName: "",
  contactPersonNumber: "",
  contactPersonEmail: "",
};

const SalesOrderForm = ({ onClose, refresh, editOrder = null }) => {
  const isEditMode = Boolean(editOrder?._id);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const fieldRefs = useRef({});

  const rejectionComment = useMemo(() => {
    const comments = [];

    if (editOrder?.rejectionComment) comments.push(editOrder.rejectionComment);
    if (editOrder?.adminRejectionComment)
      comments.push(editOrder.adminRejectionComment);
    if (editOrder?.managerRejectionComment)
      comments.push(editOrder.managerRejectionComment);
    if (editOrder?.adminApproval?.rejectionComment)
      comments.push(editOrder.adminApproval.rejectionComment);
    if (editOrder?.managerApproval?.rejectionComment)
      comments.push(editOrder.managerApproval.rejectionComment);

    if (Array.isArray(editOrder?.approvalHistory)) {
      editOrder.approvalHistory.forEach((item) => {
        if (item?.rejectionComment) comments.push(item.rejectionComment);
        if (item?.comment) comments.push(item.comment);
        if (item?.remarks) comments.push(item.remarks);
      });
    }

    return comments.filter(Boolean).join(" | ");
  }, [editOrder]);

  const revisionFields = useMemo(() => {
    const text = String(rejectionComment || "").toLowerCase();
    const fields = new Set();

    const addIf = (keywords, fieldNames) => {
      if (keywords.some((keyword) => text.includes(keyword))) {
        fieldNames.forEach((field) => fields.add(field));
      }
    };

    addIf(["payment term", "payment terms", "payment"], [
      "paymentTerms",
      "isPaymentTermsApprovedByManagement",
      "paymentTermsApprovedBy",
    ]);
    addIf(["freight", "transport"], ["freight", "freightExtraCharges"]);
    addIf(["cutting", "cut length", "cutting cost"], [
      "cutLengthRequired",
      "cuttingCost",
      "cuttingExtraCharges",
    ]);
    addIf(["gst", "gstin"], [
      "gstinNumber",
      "billingCombined",
      "shippingCombined",
    ]);
    addIf(["billing"], ["billingSameAsCompany", "billingCombined"]);
    addIf(["shipping", "delivery address", "location"], [
      "shippingSameAsCompany",
      "shippingCombined",
    ]);
    addIf(["delivery time", "delivery"], ["deliveryTime"]);
    addIf(["tolerance"], ["tolerance"]);
    addIf(["supply"], ["supplyCondition", "otherSupplyConditions"]);
    addIf(["contact", "email", "phone", "mobile"], [
      "contactPersonName",
      "contactPersonNumber",
      "contactPersonEmail",
    ]);
    addIf(["order value", "value", "amount"], ["orderValue"]);
    addIf(["po number", "po no", "po"], ["poNumber", "customerPOFile"]);
    addIf(["checklist"], ["checklistNumber"]);
    addIf(["previous payment", "old payment"], [
      "previousPaymentAvailable",
      "previousPaymentStatus",
    ]);
    addIf(["special note", "note"], ["specialNote"]);
    addIf(["enquiry"], ["enquiryFormFilled"]);
    addIf(["size", "grade", "qty", "quantity", "rate"], [
      "sizeGradeQuantityRate",
    ]);

    return fields;
  }, [rejectionComment]);

  useEffect(() => {
    if (!editOrder) return;

    const billingObj =
      typeof editOrder.billingAddress === "object" && editOrder.billingAddress
        ? editOrder.billingAddress
        : {};

    const shippingObj =
      typeof editOrder.shippingAddress === "object" && editOrder.shippingAddress
        ? editOrder.shippingAddress
        : {};

    const previousPaymentValue = editOrder.previousPaymentStatus || "no";
    const previousPaymentRemarkValue = editOrder.previousPaymentRemark || "";

    setForm({
      ...initialForm,

      companyName: editOrder.companyName || "",
      companyAddress: editOrder.companyAddress || "",
      gstinNumber: editOrder.gstinNumber || "",

      poNumber: editOrder.poNumber || "",
      checklistNumber: editOrder.checklistNumber || "",

      customerType: resolveOptionValue(
        editOrder.customerType,
        ["existing", "new"],
        "existing"
      ),
      customerPOFile: null,

      paymentTerms: normalizePaymentTerm(editOrder.paymentTerms),
      otherPaymentTerms:
        editOrder.otherPaymentTerms || editOrder.otherPaymentTerm || "",
      orderValue: editOrder.orderValue || "",

      isPaymentTermsApprovedByManagement:
        editOrder.isPaymentTermsApprovedByManagement ? "true" : "false",

      paymentTermsApprovedBy: editOrder.paymentTermsApprovedBy || "",

      previousPaymentAvailable: yesNoValue(previousPaymentValue, "no"),
      previousPaymentStatus: previousPaymentRemarkValue,

      specialNote: editOrder.specialNote || "",

      poAsPerQuotation: yesNoValue(
        editOrder.poAsPerQuotation || editOrder.poAsPerQuote,
        ""
      ),

      billingSameAsCompany: boolSelectValue(
        billingObj.sameAsCompanyAddress ?? editOrder.billingSameAsCompany,
        "true"
      ),
      billingAddress: billingObj.address || editOrder.billingAddressText || "",
      billingGstinNumber:
        billingObj.gstinNumber || editOrder.billingGstinNumber || "",

      shippingSameAsCompany: boolSelectValue(
        shippingObj.sameAsCompanyAddress ?? editOrder.shippingSameAsCompany,
        "true"
      ),
      shippingAddress:
        shippingObj.address || editOrder.shippingAddressText || editOrder.location || "",
      shippingGstinNumber:
        shippingObj.gstinNumber || editOrder.shippingGstinNumber || "",

      enquiryFormFilled: yesNoValue(editOrder.enquiryFormFilled, ""),

      sizeGradeQuantityRate: editOrder.sizeGradeQuantityRate || "",
      supplyCondition: normalizeSupplyCondition(editOrder.supplyCondition),
      otherSupplyConditions: editOrder.otherSupplyConditions || "",

      cutLengthRequired: yesNoValue(
        editOrder.cutLengthRequired ?? editOrder.isCutLengthRequired,
        ""
      ),
      cuttingCost: normalizeCuttingCost(
        editOrder.cuttingCost || editOrder.cuttingCostType
      ),
      cuttingExtraCharges:
        editOrder.cuttingExtraCharges ||
        editOrder.cuttingExtraCharge ||
        editOrder.cuttingCharges ||
        "",

      freight: normalizeFreight(editOrder.freight || editOrder.freightType),
      freightExtraCharges:
        editOrder.freightExtraCharges ||
        editOrder.freightExtraCharge ||
        editOrder.freightCharges ||
        "",

      tolerance: editOrder.tolerance || "",
      endUseOfCustomer: editOrder.endUseOfCustomer || "",
      deliveryTime: editOrder.deliveryTime || "",
      testCertificateRequired: yesNoValue(
        editOrder.testCertificateRequired,
        "yes"
      ),

      contactPersonName: editOrder.contactPersonName || "",
      contactPersonNumber: editOrder.contactPersonNumber || "",
      contactPersonEmail:
        editOrder.contactPersonEmail ||
        editOrder.contactPersonEmailId ||
        editOrder.customerEmail ||
        "",
    });
  }, [editOrder]);

  useEffect(() => {
    if (!isEditMode || !rejectionComment) return;

    setTimeout(() => {
      const firstRevisionField = Array.from(revisionFields)[0];
      if (firstRevisionField) {
        scrollToField(firstRevisionField);
      }
    }, 350);
  }, [isEditMode, rejectionComment, revisionFields]);

  const isPaymentApproved = form.isPaymentTermsApprovedByManagement === "true";
  const isOtherPaymentTerms = form.paymentTerms === "other";
  const isOtherSupplyCondition = form.supplyCondition === "other";
  const billingDifferent = form.billingSameAsCompany === "false";
  const shippingDifferent = form.shippingSameAsCompany === "false";
  const previousPaymentYes = form.previousPaymentAvailable === "yes";
  const cuttingExtra = form.cuttingCost === "extra";
  const freightExtra = form.freight === "extra";

  const mandatoryLabel = (text) => (
    <>
      {text} <span className="required-star">*</span>
    </>
  );

  const validateEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateGstin = (gstin) => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(
      gstin
    );
  };

  const scrollToField = (fieldName) => {
    const el = fieldRefs.current[fieldName];

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const input = el.querySelector("input, select, textarea");
      if (input && !input.disabled) {
        setTimeout(() => input.focus(), 300);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const requiredFields = [
      ["companyName", "Company name is required"],
      ["companyAddress", "Company address is required"],
      ["gstinNumber", "GSTIN is required"],
      ["poNumber", "PO number is required"],
      ["customerType", "Customer type is required"],
      ["paymentTerms", "Payment terms are required"],
      ["orderValue", "Order value is required"],
      ["previousPaymentAvailable", "Previous payment selection is required"],
      ["poAsPerQuotation", "PO as per quotation is required"],
      ["enquiryFormFilled", "Enquiry form status is required"],
      ["sizeGradeQuantityRate", "Size / Grade / Qty / Rate is required"],
      ["supplyCondition", "Supply condition is required"],
      ["cutLengthRequired", "Cut length required is required"],
      ["cuttingCost", "Cutting cost is required"],
      ["freight", "Freight is required"],
      ["tolerance", "Tolerance is required"],
      ["endUseOfCustomer", "End use of customer is required"],
      ["deliveryTime", "Delivery time is required"],
      ["contactPersonName", "Contact person name is required"],
      ["contactPersonNumber", "Contact number is required"],
      ["contactPersonEmail", "Contact person email is required"],
    ];

    requiredFields.forEach(([field, message]) => {
      if (!String(form[field] || "").trim()) {
        newErrors[field] = message;
      }
    });

    if (form.gstinNumber && !validateGstin(form.gstinNumber.trim())) {
      newErrors.gstinNumber = "Please enter valid GSTIN";
    }

    if (billingDifferent) {
      if (!form.billingAddress.trim()) {
        newErrors.billingCombined = "Billing address is required";
      }

      if (!form.billingGstinNumber.trim()) {
        newErrors.billingCombined = "Billing GSTIN is required";
      } else if (!validateGstin(form.billingGstinNumber.trim())) {
        newErrors.billingCombined = "Please enter valid billing GSTIN";
      }
    }

    if (shippingDifferent) {
      if (!form.shippingAddress.trim()) {
        newErrors.shippingCombined = "Shipping address is required";
      }

      if (!form.shippingGstinNumber.trim()) {
        newErrors.shippingCombined = "Shipping GSTIN is required";
      } else if (!validateGstin(form.shippingGstinNumber.trim())) {
        newErrors.shippingCombined = "Please enter valid shipping GSTIN";
      }
    }

    if (Number(form.orderValue) <= 0) {
      newErrors.orderValue = "Order value must be greater than 0";
    }

    if (isOtherPaymentTerms && !form.otherPaymentTerms.trim()) {
      newErrors.otherPaymentTerms = "Enter other payment terms";
    }

    if (isPaymentApproved && !form.paymentTermsApprovedBy) {
      newErrors.paymentTermsApprovedBy = "Select approved person";
    }

    if (previousPaymentYes && !form.previousPaymentStatus.trim()) {
      newErrors.previousPaymentStatus = "Previous payment details are required";
    }

    if (isOtherSupplyCondition && !form.otherSupplyConditions.trim()) {
      newErrors.otherSupplyConditions = "Enter supply condition";
    }

    if (!/^[0-9]{10}$/.test(form.contactPersonNumber)) {
      newErrors.contactPersonNumber =
        "Contact number must be exactly 10 digits";
    }

    if (!validateEmail(form.contactPersonEmail)) {
      newErrors.contactPersonEmail = "Please enter valid email address";
    }

    if (!isEditMode && !form.customerPOFile) {
      newErrors.customerPOFile = "Customer PO PDF is required";
    }

    if (form.customerPOFile && form.customerPOFile.type !== "application/pdf") {
      newErrors.customerPOFile = "Only PDF file is allowed";
    }

    setErrors(newErrors);

    const firstErrorField = Object.keys(newErrors)[0];

    if (firstErrorField) {
      setTimeout(() => scrollToField(firstErrorField), 100);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "customerPOFile") {
      setForm((prev) => ({
        ...prev,
        customerPOFile: files?.[0] || null,
      }));
      return;
    }

    if (name === "contactPersonNumber") {
      setForm((prev) => ({
        ...prev,
        contactPersonNumber: value.replace(/\D/g, "").slice(0, 10),
      }));
      return;
    }

    if (
      name === "gstinNumber" ||
      name === "billingGstinNumber" ||
      name === "shippingGstinNumber"
    ) {
      setForm((prev) => ({
        ...prev,
        [name]: value.toUpperCase().slice(0, 15),
      }));
      return;
    }

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "billingSameAsCompany" && value === "true") {
        updated.billingAddress = "";
        updated.billingGstinNumber = "";
      }

      if (name === "shippingSameAsCompany" && value === "true") {
        updated.shippingAddress = "";
        updated.shippingGstinNumber = "";
      }

      if (name === "paymentTerms" && value !== "other") {
        updated.otherPaymentTerms = "";
      }

      if (name === "previousPaymentAvailable" && value === "no") {
        updated.previousPaymentStatus = "";
      }

      if (name === "supplyCondition" && value !== "other") {
        updated.otherSupplyConditions = "";
      }

      if (name === "cuttingCost" && value !== "extra") {
        updated.cuttingExtraCharges = "";
      }

      if (name === "freight" && value !== "extra") {
        updated.freightExtraCharges = "";
      }

      return updated;
    });
  };

  const buildPayload = () => {
    return {
      companyName: form.companyName.trim(),
      companyAddress: form.companyAddress.trim(),
      gstinNumber: form.gstinNumber.trim(),

      poNumber: form.poNumber.trim(),
      checklistNumber: form.checklistNumber.trim(),

      customerType: form.customerType,

      contactPersonName: form.contactPersonName.trim(),
      contactPersonNumber: form.contactPersonNumber.trim(),
      contactPersonEmail: form.contactPersonEmail.trim(),

      paymentTerms: form.paymentTerms,
      otherPaymentTerms: isOtherPaymentTerms
        ? form.otherPaymentTerms.trim()
        : "",
      orderValue: Number(form.orderValue),

      isPaymentTermsApprovedByManagement: isPaymentApproved,
      paymentTermsApprovedBy: isPaymentApproved
        ? form.paymentTermsApprovedBy
        : null,

      previousPaymentStatus: previousPaymentYes ? "yes" : "no",
      previousPaymentRemark: previousPaymentYes
        ? form.previousPaymentStatus.trim()
        : "",

      specialNote: form.specialNote.trim(),

      poAsPerQuotation: form.poAsPerQuotation,

      sizeGradeQuantityRate: form.sizeGradeQuantityRate.trim(),

      supplyCondition: form.supplyCondition,

      otherSupplyConditions: isOtherSupplyCondition
        ? form.otherSupplyConditions.trim()
        : "",

      cutLengthRequired: form.cutLengthRequired,
      cuttingCost: form.cuttingCost,
      cuttingExtraCharges: cuttingExtra ? form.cuttingExtraCharges.trim() : "",

      freight: form.freight,
      freightExtraCharges: freightExtra ? form.freightExtraCharges.trim() : "",

      billingAddress: {
        sameAsCompanyAddress: form.billingSameAsCompany === "true",
        address:
          form.billingSameAsCompany === "true"
            ? form.companyAddress.trim()
            : form.billingAddress.trim(),
        gstinNumber:
          form.billingSameAsCompany === "true"
            ? form.gstinNumber.trim()
            : form.billingGstinNumber.trim(),
      },

      shippingAddress: {
        sameAsCompanyAddress: form.shippingSameAsCompany === "true",
        address:
          form.shippingSameAsCompany === "true"
            ? form.companyAddress.trim()
            : form.shippingAddress.trim(),
        gstinNumber:
          form.shippingSameAsCompany === "true"
            ? form.gstinNumber.trim()
            : form.shippingGstinNumber.trim(),
      },

      tolerance: form.tolerance.trim(),
      endUseOfCustomer: form.endUseOfCustomer,
      deliveryTime: form.deliveryTime.trim(),

      testCertificateRequired: "yes",

      enquiryFormFilled: form.enquiryFormFilled,
      enquiryNumber: "",
    };
  };

  const appendToFormData = (fd, payload) => {
    fd.append("data", JSON.stringify(payload));

    if (form.customerPOFile) {
      fd.append("customerPOFile", form.customerPOFile);
    }

    return fd;
  };

  const getSalesOrderId = (response) => {
    return (
      response?.data?._id ||
      response?.salesOrder?._id ||
      response?._id ||
      response?.data?.salesOrder?._id
    );
  };

  const getPdfUrlFromResponse = (response) => {
    const fileUrl =
      response?.data?.pdf?.fileUrl ||
      response?.data?.finalSalesOrderPackage?.fileUrl ||
      response?.pdf?.fileUrl ||
      response?.fileUrl;

    if (!fileUrl) return "";

    const base =
      process.env.REACT_APP_BACKEND_URL ||
      "https://bharatspecialsteels.bharatspecialsteels.com";

    return fileUrl.startsWith("http")
      ? fileUrl
      : `${base.replace(/\/$/, "")}${
          fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`
        }`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setPdfGenerating(false);
    setPdfUrl("");

    try {
      const payload = buildPayload();

      let savedResponse;

      if (isEditMode) {
        savedResponse = await updateSalesOrder(editOrder._id, payload);
      } else {
        savedResponse = await createSalesOrder(
          appendToFormData(new FormData(), payload)
        );
      }

      const salesOrderId = isEditMode
        ? editOrder._id
        : getSalesOrderId(savedResponse);

      if (salesOrderId) {
        setPdfGenerating(true);
        try {
          const pdfResponse = await generateSalesOrderPdf(salesOrderId);
          const generatedUrl = getPdfUrlFromResponse(pdfResponse);
          if (generatedUrl) setPdfUrl(generatedUrl);
        } catch (pdfError) {
          console.log(pdfError);
          alert("Sales order saved, but PDF generation failed.");
        } finally {
          setPdfGenerating(false);
        }
      }

      alert(
        isEditMode
          ? "Sales order updated successfully"
          : "Sales order created successfully"
      );

      refresh();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save sales order");
    } finally {
      setIsSubmitting(false);
      setPdfGenerating(false);
    }
  };

  const fieldClass = (name, extra = "") =>
    `sales-form-group ${errors[name] ? "has-error" : ""} ${
      revisionFields.has(name) ? "revision-highlight" : ""
    } ${extra}`;

  const refProp = (name) => ({
    ref: (el) => {
      fieldRefs.current[name] = el;
    },
  });

  const errorText = (name) =>
    errors[name] ? (
      <small className="sales-field-error">{errors[name]}</small>
    ) : null;

  return (
    <div className="sales-form-overlay">
      <div className="sales-form-card premium-sales-form">
        <div className="sales-form-header sales-premium-header">
          <div>
            <h2>{isEditMode ? "Edit Sales Order" : "New Sales Order"}</h2>
            <p>
              Fill customer PO details and generate final Sales Order package.
            </p>
          </div>

          <button type="button" className="sales-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {isEditMode && rejectionComment && (
          <div className="revision-comment-box">
            <strong>Revision Comment:</strong> {rejectionComment}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section-title premium-section-title">
            <span>01</span> Customer & PO Details
          </div>

          <div className="sales-form-grid">
            <div className="sales-form-group">
              <label>Order Date</label>
              <input type="date" value={getToday()} disabled />
              <small className="auto-hint">Auto set on submission</small>
            </div>

            <div
              className={fieldClass("companyName")}
              {...refProp("companyName")}
            >
              <label>{mandatoryLabel("Company Name")}</label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="Example: ABC Engineering Pvt Ltd"
              />
              {errorText("companyName")}
            </div>

            <div
              className={fieldClass("gstinNumber")}
              {...refProp("gstinNumber")}
            >
              <label>{mandatoryLabel("Company GSTIN")}</label>
              <input
                name="gstinNumber"
                value={form.gstinNumber}
                onChange={handleChange}
                maxLength={15}
                placeholder="Example: 27ABCDE1234F1Z5"
              />
              {errorText("gstinNumber")}
            </div>

            <div
              className={fieldClass("companyAddress", "sales-full-width")}
              {...refProp("companyAddress")}
            >
              <label>{mandatoryLabel("Company Address")}</label>
              <textarea
                name="companyAddress"
                value={form.companyAddress}
                onChange={handleChange}
                placeholder="Example: Plot No, Industrial Area, City, State - Pincode"
              />
              {errorText("companyAddress")}
            </div>

            <div className={fieldClass("poNumber")} {...refProp("poNumber")}>
              <label>{mandatoryLabel("PO Number")}</label>
              <input
                name="poNumber"
                value={form.poNumber}
                onChange={handleChange}
                placeholder="Example: PO/2026/001"
              />
              {errorText("poNumber")}
            </div>

            <div
              className={fieldClass("checklistNumber")}
              {...refProp("checklistNumber")}
            >
              <label>Checklist Number</label>
              <input
                name="checklistNumber"
                value={form.checklistNumber}
                onChange={handleChange}
                placeholder="Example: CHK-001"
              />
            </div>

            <div
              className={fieldClass("customerType")}
              {...refProp("customerType")}
            >
              <label>{mandatoryLabel("Customer Type")}</label>
              <select
                name="customerType"
                value={form.customerType}
                onChange={handleChange}
              >
                <option value="existing">Existing</option>
                <option value="new">New</option>
              </select>
              <small className="auto-hint">Existing selected by default</small>
              {errorText("customerType")}
            </div>

            <div
              className={fieldClass("customerPOFile")}
              {...refProp("customerPOFile")}
            >
              <label>
                {isEditMode
                  ? "Replace Customer PO PDF"
                  : mandatoryLabel("Customer PO PDF")}
              </label>
              <input
                type="file"
                name="customerPOFile"
                accept="application/pdf"
                onChange={handleChange}
              />
              {isEditMode && !form.customerPOFile && (
                <small className="auto-hint">
                  Existing PO file will remain unchanged unless you upload a new
                  PDF.
                </small>
              )}
              {form.customerPOFile && (
                <small className="file-selected">
                  Selected: {form.customerPOFile.name}
                </small>
              )}
              {errorText("customerPOFile")}
            </div>
          </div>

          <div className="form-section-title premium-section-title">
            <span>02</span> Commercial, Address & Enquiry
          </div>

          <div className="sales-form-grid">
            <div
              className={fieldClass("paymentTerms", "sales-full-width")}
              {...refProp("paymentTerms")}
            >
              <label>{mandatoryLabel("Payment Terms")}</label>
              <select
                name="paymentTerms"
                value={form.paymentTerms}
                onChange={handleChange}
              >
                <option value="">Select payment terms</option>
                {paymentTermOptions.map((term) => (
                  <option key={term} value={term}>
                    {formatPaymentTermLabel(term)}
                  </option>
                ))}
              </select>
              {errorText("paymentTerms")}
            </div>

            {isOtherPaymentTerms && (
              <div
                className={fieldClass("otherPaymentTerms", "sales-full-width")}
                {...refProp("otherPaymentTerms")}
              >
                <label>{mandatoryLabel("Other Payment Terms")}</label>
                <textarea
                  name="otherPaymentTerms"
                  value={form.otherPaymentTerms}
                  onChange={handleChange}
                  placeholder="Example: 25% advance, balance within 7 days after dispatch"
                  rows={3}
                />
                {errorText("otherPaymentTerms")}
              </div>
            )}

            <div className={fieldClass("orderValue")} {...refProp("orderValue")}>
              <label>{mandatoryLabel("Order Value")}</label>
              <input
                type="number"
                name="orderValue"
                value={form.orderValue}
                onChange={handleChange}
                placeholder="Example: 250000"
              />
              {errorText("orderValue")}
            </div>

            <div
              className={fieldClass("isPaymentTermsApprovedByManagement")}
              {...refProp("isPaymentTermsApprovedByManagement")}
            >
              <label>{mandatoryLabel("Payment Terms Approved?")}</label>
              <select
                name="isPaymentTermsApprovedByManagement"
                value={form.isPaymentTermsApprovedByManagement}
                onChange={handleChange}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>

            {isPaymentApproved && (
              <div
                className={fieldClass("paymentTermsApprovedBy")}
                {...refProp("paymentTermsApprovedBy")}
              >
                <label>{mandatoryLabel("Approved By")}</label>
                <select
                  name="paymentTermsApprovedBy"
                  value={form.paymentTermsApprovedBy}
                  onChange={handleChange}
                >
                  <option value="">Select approver</option>
                  {approverOptions.map((person) => (
                    <option key={person} value={person}>
                      {formatLabel(person)}
                    </option>
                  ))}
                </select>
                {errorText("paymentTermsApprovedBy")}
              </div>
            )}

            <div
              className={fieldClass("previousPaymentAvailable")}
              {...refProp("previousPaymentAvailable")}
            >
              <label>{mandatoryLabel("Previous Payment?")}</label>
              <select
                name="previousPaymentAvailable"
                value={form.previousPaymentAvailable}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errorText("previousPaymentAvailable")}
            </div>

            {previousPaymentYes && (
              <div
                className={fieldClass(
                  "previousPaymentStatus",
                  "sales-full-width"
                )}
                {...refProp("previousPaymentStatus")}
              >
                <label>{mandatoryLabel("Previous Payment Details")}</label>
                <textarea
                  name="previousPaymentStatus"
                  value={form.previousPaymentStatus}
                  onChange={handleChange}
                  placeholder="Example: Date of Inv: 10/05/2026 | Inv No: INV-102 | Invoice Value: 2,50,000 | Due Date: 25/05/2026 | Overdue Days: 0"
                />
                {errorText("previousPaymentStatus")}
              </div>
            )}

            <div
              className={fieldClass("specialNote", "sales-full-width")}
              {...refProp("specialNote")}
            >
              <label>Special Note</label>
              <textarea
                name="specialNote"
                value={form.specialNote}
                onChange={handleChange}
                placeholder="Optional note for this sales order"
                rows={3}
              />
            </div>

            <div
              className={fieldClass("poAsPerQuotation")}
              {...refProp("poAsPerQuotation")}
            >
              <label>{mandatoryLabel("PO As Per Quotation")}</label>
              <select
                name="poAsPerQuotation"
                value={form.poAsPerQuotation}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errorText("poAsPerQuotation")}
            </div>

            <div
              className={fieldClass("billingSameAsCompany")}
              {...refProp("billingSameAsCompany")}
            >
              <label>Billing Same As Company?</label>
              <select
                name="billingSameAsCompany"
                value={form.billingSameAsCompany}
                onChange={handleChange}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {billingDifferent && (
              <div
                className={fieldClass("billingCombined", "sales-full-width")}
                {...refProp("billingCombined")}
              >
                <label>{mandatoryLabel("Billing Address With GSTIN")}</label>
                <div className="combined-address-box">
                  <textarea
                    name="billingAddress"
                    value={form.billingAddress}
                    onChange={handleChange}
                    placeholder="Billing Address: office address with city, state and pincode"
                  />
                  <div className="combined-gstin-row">
                    <span>GSTIN</span>
                    <input
                      name="billingGstinNumber"
                      value={form.billingGstinNumber}
                      onChange={handleChange}
                      maxLength={15}
                      placeholder="27ABCDE1234F1Z5"
                    />
                  </div>
                </div>
                {errorText("billingCombined")}
              </div>
            )}

            <div
              className={fieldClass("shippingSameAsCompany")}
              {...refProp("shippingSameAsCompany")}
            >
              <label>Shipping Same As Company?</label>
              <select
                name="shippingSameAsCompany"
                value={form.shippingSameAsCompany}
                onChange={handleChange}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {shippingDifferent && (
              <div
                className={fieldClass("shippingCombined", "sales-full-width")}
                {...refProp("shippingCombined")}
              >
                <label>{mandatoryLabel("Shipping Address With GSTIN")}</label>
                <div className="combined-address-box">
                  <textarea
                    name="shippingAddress"
                    value={form.shippingAddress}
                    onChange={handleChange}
                    placeholder="Shipping Address: delivery location with city, state and pincode"
                  />
                  <div className="combined-gstin-row">
                    <span>GSTIN</span>
                    <input
                      name="shippingGstinNumber"
                      value={form.shippingGstinNumber}
                      onChange={handleChange}
                      maxLength={15}
                      placeholder="27ABCDE1234F1Z5"
                    />
                  </div>
                </div>
                {errorText("shippingCombined")}
              </div>
            )}

            <div
              className={fieldClass("enquiryFormFilled")}
              {...refProp("enquiryFormFilled")}
            >
              <label>{mandatoryLabel("Enquiry Form Filled?")}</label>
              <select
                name="enquiryFormFilled"
                value={form.enquiryFormFilled}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errorText("enquiryFormFilled")}
            </div>
          </div>

          <div className="form-section-title premium-section-title">
            <span>03</span> Material Details
          </div>

          <div className="sales-form-grid">
            <div
              className={fieldClass(
                "sizeGradeQuantityRate",
                "sales-full-width"
              )}
              {...refProp("sizeGradeQuantityRate")}
            >
              <label>{mandatoryLabel("Size / Grade / Qty / Rate")}</label>
              <textarea
                name="sizeGradeQuantityRate"
                value={form.sizeGradeQuantityRate}
                onChange={handleChange}
                rows={8}
                placeholder="Example: Size: 100 Dia x 5000 Long | Grade: H13 | Qty: 500 Kg | Rate: 250/Kg"
              />
              {errorText("sizeGradeQuantityRate")}
            </div>

            <div
              className={fieldClass("supplyCondition")}
              {...refProp("supplyCondition")}
            >
              <label>{mandatoryLabel("Supply Condition")}</label>
              <select
                name="supplyCondition"
                value={form.supplyCondition}
                onChange={handleChange}
              >
                {supplyConditionOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {errorText("supplyCondition")}
            </div>

            {isOtherSupplyCondition && (
              <div
                className={fieldClass("otherSupplyConditions")}
                {...refProp("otherSupplyConditions")}
              >
                <label>{mandatoryLabel("Other Supply Conditions")}</label>
                <input
                  name="otherSupplyConditions"
                  value={form.otherSupplyConditions}
                  onChange={handleChange}
                  placeholder="Enter custom supply condition"
                />
                {errorText("otherSupplyConditions")}
              </div>
            )}

            <div
              className={fieldClass("cutLengthRequired")}
              {...refProp("cutLengthRequired")}
            >
              <label>{mandatoryLabel("Cut Length Required")}</label>
              <select
                name="cutLengthRequired"
                value={form.cutLengthRequired}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errorText("cutLengthRequired")}
            </div>

            <div
              className={fieldClass("cuttingCost")}
              {...refProp("cuttingCost")}
            >
              <label>{mandatoryLabel("Cutting Cost")}</label>
              <select
                name="cuttingCost"
                value={form.cuttingCost}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="extra">Extra</option>
                <option value="inclusive">Inclusive</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
              {errorText("cuttingCost")}
            </div>

            {cuttingExtra && (
              <div
                className={fieldClass("cuttingExtraCharges")}
                {...refProp("cuttingExtraCharges")}
              >
                <label>Cutting Extra Charges</label>
                <input
                  name="cuttingExtraCharges"
                  value={form.cuttingExtraCharges}
                  onChange={handleChange}
                  placeholder="Example: ₹5/Kg or ₹2500 extra"
                />
                {errorText("cuttingExtraCharges")}
              </div>
            )}

            <div className={fieldClass("freight")} {...refProp("freight")}>
              <label>{mandatoryLabel("Freight")}</label>
              <select
                name="freight"
                value={form.freight}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="extra">Extra</option>
                <option value="self">Self-Pickup</option>
                <option value="inclusive">Inclusive</option>
              </select>
              {errorText("freight")}
            </div>

            {freightExtra && (
              <div
                className={fieldClass("freightExtraCharges")}
                {...refProp("freightExtraCharges")}
              >
                <label>Freight Extra Charges</label>
                <input
                  name="freightExtraCharges"
                  value={form.freightExtraCharges}
                  onChange={handleChange}
                  placeholder="Example: ₹3500 extra"
                />
                {errorText("freightExtraCharges")}
              </div>
            )}

            <div className={fieldClass("tolerance")} {...refProp("tolerance")}>
              <label>{mandatoryLabel("Tolerance")}</label>
              <input
                name="tolerance"
                value={form.tolerance}
                onChange={handleChange}
                placeholder="Example: +2 / -0 mm"
              />
              {errorText("tolerance")}
            </div>

            <div
              className={fieldClass("endUseOfCustomer")}
              {...refProp("endUseOfCustomer")}
            >
              <label>{mandatoryLabel("End Use Of Customer")}</label>
              <select
                name="endUseOfCustomer"
                value={form.endUseOfCustomer}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="machining">Machining</option>
                <option value="forging">Forging</option>
              </select>
              {errorText("endUseOfCustomer")}
            </div>

            <div
              className={fieldClass("deliveryTime")}
              {...refProp("deliveryTime")}
            >
              <label>{mandatoryLabel("Delivery Time")}</label>
              <input
                name="deliveryTime"
                value={form.deliveryTime}
                onChange={handleChange}
                placeholder="Example: 2-3 weeks from PO confirmation"
              />
              {errorText("deliveryTime")}
            </div>

            <div className="sales-form-group">
              <label>Test Certificate</label>
              <input value="YES - Auto" disabled />
              <small className="auto-hint">Always included</small>
            </div>
          </div>

          <div className="form-section-title premium-section-title">
            <span>04</span> Contact Details
          </div>

          <div className="sales-form-grid">
            <div
              className={fieldClass("contactPersonName")}
              {...refProp("contactPersonName")}
            >
              <label>{mandatoryLabel("Contact Person Name")}</label>
              <input
                name="contactPersonName"
                value={form.contactPersonName}
                onChange={handleChange}
                placeholder="Example: Rajesh Kumar"
              />
              {errorText("contactPersonName")}
            </div>

            <div
              className={fieldClass("contactPersonNumber")}
              {...refProp("contactPersonNumber")}
            >
              <label>{mandatoryLabel("Contact Person Number")}</label>
              <input
                name="contactPersonNumber"
                value={form.contactPersonNumber}
                onChange={handleChange}
                maxLength={10}
                placeholder="10 digit mobile number"
              />
              {errorText("contactPersonNumber")}
            </div>

            <div
              className={fieldClass("contactPersonEmail")}
              {...refProp("contactPersonEmail")}
            >
              <label>{mandatoryLabel("Contact Person Email")}</label>
              <input
                type="email"
                name="contactPersonEmail"
                value={form.contactPersonEmail}
                onChange={handleChange}
                placeholder="Example: purchase@company.com"
              />
              {errorText("contactPersonEmail")}
            </div>
          </div>

          {pdfGenerating && (
            <div className="pdf-generation-box">
              Generating final Sales Order PDF...
            </div>
          )}

          {pdfUrl && (
            <div className="pdf-ready-box">
              PDF generated successfully.{" "}
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            </div>
          )}

          <div className="sales-form-actions">
            <button
              type="button"
              className="sales-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="sales-submit-btn"
              disabled={isSubmitting || pdfGenerating}
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : pdfGenerating
                ? "Generating PDF..."
                : isEditMode
                ? "Update & Generate PDF"
                : "Create & Generate PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesOrderForm;
import React, { useEffect, useState } from "react";
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
];
const approverOptions = ["nilesh_sir", "jatin_sir", "mayank_sir"];

const formatLabel = (value = "") =>
  String(value).replaceAll("_", " ").toUpperCase();

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
  orderValue: "",
  isPaymentTermsApprovedByManagement: "false",
  paymentTermsApprovedBy: "",

  previousPaymentStatus: "",
  poAsPerQuotation: "",

  billingSameAsCompany: "true",
  billingAddress: "",

  shippingSameAsCompany: "true",
  shippingAddress: "",

  enquiryFormFilled: "",
  enquiryNumber: "",

  sizeGradeQuantityRate: "",
  supplyCondition: "as_per_standard",
  otherSupplyConditions: "",
  cutLengthRequired: "",
  cuttingCost: "",
  freight: "",
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

  useEffect(() => {
    if (!editOrder) return;

    setForm({
      ...initialForm,

      companyName: editOrder.companyName || "",
      companyAddress: editOrder.companyAddress || "",
      gstinNumber: editOrder.gstinNumber || "",

      poNumber: editOrder.poNumber || "",
      checklistNumber: editOrder.checklistNumber || "",

      customerType: editOrder.customerType || "existing",
      customerPOFile: null,

      paymentTerms: editOrder.paymentTerms || "",
      orderValue: editOrder.orderValue || "",

      isPaymentTermsApprovedByManagement:
        editOrder.isPaymentTermsApprovedByManagement ? "true" : "false",

      paymentTermsApprovedBy: editOrder.paymentTermsApprovedBy || "",

      previousPaymentStatus: editOrder.previousPaymentStatus || "",
      poAsPerQuotation: editOrder.poAsPerQuotation || "",

      billingSameAsCompany: editOrder.billingAddress?.sameAsCompanyAddress
        ? "true"
        : "false",
      billingAddress: editOrder.billingAddress?.address || "",

      shippingSameAsCompany: editOrder.shippingAddress?.sameAsCompanyAddress
        ? "true"
        : "false",
      shippingAddress: editOrder.shippingAddress?.address || "",

      enquiryFormFilled: editOrder.enquiryFormFilled || "",
      enquiryNumber: editOrder.enquiryNumber || "",

      sizeGradeQuantityRate: editOrder.sizeGradeQuantityRate || "",
      supplyCondition: editOrder.supplyCondition || "as_per_standard",
      otherSupplyConditions: Array.isArray(editOrder.otherSupplyConditions)
        ? editOrder.otherSupplyConditions.join(", ")
        : "",

      cutLengthRequired: editOrder.cutLengthRequired || "",
      cuttingCost: editOrder.cuttingCost || "",
      freight: editOrder.freight || "",
      tolerance: editOrder.tolerance || "",
      endUseOfCustomer: editOrder.endUseOfCustomer || "",
      deliveryTime: editOrder.deliveryTime || "",
      testCertificateRequired: "yes",

      contactPersonName: editOrder.contactPersonName || "",
      contactPersonNumber: editOrder.contactPersonNumber || "",
      contactPersonEmail: editOrder.contactPersonEmail || "",
    });
  }, [editOrder]);

  const isPaymentApproved = form.isPaymentTermsApprovedByManagement === "true";
  const isOtherSupplyCondition = form.supplyCondition === "other";
  const billingDifferent = form.billingSameAsCompany === "false";
  const shippingDifferent = form.shippingSameAsCompany === "false";
  const enquiryYes = form.enquiryFormFilled === "yes";

  const mandatoryLabel = (text) => (
    <>
      {text} <span className="required-star">*</span>
    </>
  );

  const validateEmail = (email) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateGstin = (gstin) => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(
      gstin
    );
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
      ["previousPaymentStatus", "Previous payment status is required"],
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
    ];

    requiredFields.forEach(([field, message]) => {
      if (!String(form[field] || "").trim()) {
        newErrors[field] = message;
      }
    });

    if (form.gstinNumber && !validateGstin(form.gstinNumber.trim())) {
      newErrors.gstinNumber = "Please enter valid GSTIN";
    }

    if (Number(form.orderValue) <= 0) {
      newErrors.orderValue = "Order value must be greater than 0";
    }

    if (isPaymentApproved && !form.paymentTermsApprovedBy) {
      newErrors.paymentTermsApprovedBy = "Select approved person";
    }

    if (billingDifferent && !form.billingAddress.trim()) {
      newErrors.billingAddress = "Billing address is required";
    }

    if (shippingDifferent && !form.shippingAddress.trim()) {
      newErrors.shippingAddress = "Shipping address is required";
    }

    if (enquiryYes && !form.enquiryNumber.trim()) {
      newErrors.enquiryNumber = "Enquiry number is required";
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

    if (
      form.customerPOFile &&
      form.customerPOFile.type !== "application/pdf"
    ) {
      newErrors.customerPOFile = "Only PDF file is allowed";
    }

    setErrors(newErrors);
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

    if (name === "gstinNumber") {
      setForm((prev) => ({
        ...prev,
        gstinNumber: value.toUpperCase().slice(0, 15),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      orderValue: Number(form.orderValue),

      isPaymentTermsApprovedByManagement: isPaymentApproved,
      paymentTermsApprovedBy: isPaymentApproved
        ? form.paymentTermsApprovedBy
        : null,

      previousPaymentStatus: form.previousPaymentStatus.trim(),

      poAsPerQuotation: form.poAsPerQuotation,

      sizeGradeQuantityRate: form.sizeGradeQuantityRate.trim(),

      supplyCondition: form.supplyCondition,

      otherSupplyConditions: isOtherSupplyCondition
        ? form.otherSupplyConditions
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],

      cutLengthRequired: form.cutLengthRequired,
      cuttingCost: form.cuttingCost,
      freight: form.freight,

      billingAddress: {
        sameAsCompanyAddress: form.billingSameAsCompany === "true",
        ...(form.billingSameAsCompany === "false"
          ? { address: form.billingAddress.trim() }
          : {}),
      },

      shippingAddress: {
        sameAsCompanyAddress: form.shippingSameAsCompany === "true",
        ...(form.shippingSameAsCompany === "false"
          ? { address: form.shippingAddress.trim() }
          : {}),
      },

      tolerance: form.tolerance.trim(),
      endUseOfCustomer: form.endUseOfCustomer,
      deliveryTime: form.deliveryTime.trim(),

      testCertificateRequired: "yes",

      enquiryFormFilled: form.enquiryFormFilled,
      enquiryNumber: enquiryYes ? form.enquiryNumber.trim() : "",
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

      const salesOrderId = isEditMode ? editOrder._id : getSalesOrderId(savedResponse);

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

      alert(isEditMode ? "Sales order updated successfully" : "Sales order created successfully");
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
    `sales-form-group ${errors[name] ? "has-error" : ""} ${extra}`;

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
            <p>Fill customer PO details and generate final Sales Order package.</p>
          </div>

          <button type="button" className="sales-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

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

            <div className={fieldClass("companyName")}>
              <label>{mandatoryLabel("Company Name")}</label>
              <input name="companyName" value={form.companyName} onChange={handleChange} />
              {errorText("companyName")}
            </div>

            <div className={fieldClass("gstinNumber")}>
              <label>{mandatoryLabel("GSTIN")}</label>
              <input
                name="gstinNumber"
                value={form.gstinNumber}
                onChange={handleChange}
                maxLength={15}
              />
              {errorText("gstinNumber")}
            </div>

            <div className={fieldClass("companyAddress", "sales-full-width")}>
              <label>{mandatoryLabel("Company Address")}</label>
              <textarea name="companyAddress" value={form.companyAddress} onChange={handleChange} />
              {errorText("companyAddress")}
            </div>

            <div className={fieldClass("poNumber")}>
              <label>{mandatoryLabel("PO Number")}</label>
              <input name="poNumber" value={form.poNumber} onChange={handleChange} />
              {errorText("poNumber")}
            </div>

            <div className={fieldClass("checklistNumber")}>
              <label>Checklist Number</label>
              <input name="checklistNumber" value={form.checklistNumber} onChange={handleChange} />
            </div>

            <div className={fieldClass("customerType")}>
              <label>{mandatoryLabel("Customer Type")}</label>
              <select name="customerType" value={form.customerType} onChange={handleChange}>
                <option value="existing">Existing</option>
                <option value="new">New</option>
              </select>
              <small className="auto-hint">Existing selected by default</small>
              {errorText("customerType")}
            </div>

            <div className={fieldClass("customerPOFile")}>
              <label>{isEditMode ? "Replace Customer PO PDF" : mandatoryLabel("Customer PO PDF")}</label>
              <input type="file" name="customerPOFile" accept="application/pdf" onChange={handleChange} />
              {form.customerPOFile && <small className="file-selected">Selected: {form.customerPOFile.name}</small>}
              {errorText("customerPOFile")}
            </div>
          </div>

          <div className="form-section-title premium-section-title">
            <span>02</span> Commercial, Address & Enquiry
          </div>

          <div className="sales-form-grid">
            <div className={fieldClass("paymentTerms")}>
              <label>{mandatoryLabel("Payment Terms")}</label>
              <select name="paymentTerms" value={form.paymentTerms} onChange={handleChange}>
                <option value="">Select payment terms</option>
                {paymentTermOptions.map((term) => (
                  <option key={term} value={term}>{formatLabel(term)}</option>
                ))}
              </select>
              {errorText("paymentTerms")}
            </div>

            <div className={fieldClass("orderValue")}>
              <label>{mandatoryLabel("Order Value")}</label>
              <input type="number" name="orderValue" value={form.orderValue} onChange={handleChange} />
              {errorText("orderValue")}
            </div>

            <div className={fieldClass("isPaymentTermsApprovedByManagement")}>
              <label>{mandatoryLabel("Payment Terms Approved?")}</label>
              <select name="isPaymentTermsApprovedByManagement" value={form.isPaymentTermsApprovedByManagement} onChange={handleChange}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>

            {isPaymentApproved && (
              <div className={fieldClass("paymentTermsApprovedBy")}>
                <label>{mandatoryLabel("Approved By")}</label>
                <select name="paymentTermsApprovedBy" value={form.paymentTermsApprovedBy} onChange={handleChange}>
                  <option value="">Select approver</option>
                  {approverOptions.map((person) => (
                    <option key={person} value={person}>{formatLabel(person)}</option>
                  ))}
                </select>
                {errorText("paymentTermsApprovedBy")}
              </div>
            )}

            <div className={fieldClass("previousPaymentStatus", "sales-full-width")}>
              <label>{mandatoryLabel("Previous Payment Status")}</label>
              <textarea name="previousPaymentStatus" value={form.previousPaymentStatus} onChange={handleChange} />
              {errorText("previousPaymentStatus")}
            </div>

            <div className={fieldClass("poAsPerQuotation")}>
              <label>{mandatoryLabel("PO As Per Quotation")}</label>
              <select name="poAsPerQuotation" value={form.poAsPerQuotation} onChange={handleChange}>
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errorText("poAsPerQuotation")}
            </div>

            <div className={fieldClass("billingSameAsCompany")}>
              <label>Billing Same As Company?</label>
              <select name="billingSameAsCompany" value={form.billingSameAsCompany} onChange={handleChange}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {billingDifferent && (
              <div className={fieldClass("billingAddress", "sales-full-width")}>
                <label>{mandatoryLabel("Billing Address")}</label>
                <textarea name="billingAddress" value={form.billingAddress} onChange={handleChange} />
                {errorText("billingAddress")}
              </div>
            )}

            <div className={fieldClass("shippingSameAsCompany")}>
              <label>Shipping Same As Company?</label>
              <select name="shippingSameAsCompany" value={form.shippingSameAsCompany} onChange={handleChange}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {shippingDifferent && (
              <div className={fieldClass("shippingAddress", "sales-full-width")}>
                <label>{mandatoryLabel("Shipping Address")}</label>
                <textarea name="shippingAddress" value={form.shippingAddress} onChange={handleChange} />
                {errorText("shippingAddress")}
              </div>
            )}

            <div className={fieldClass("enquiryFormFilled")}>
              <label>{mandatoryLabel("Enquiry Form Filled?")}</label>
              <select name="enquiryFormFilled" value={form.enquiryFormFilled} onChange={handleChange}>
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errorText("enquiryFormFilled")}
            </div>

            {enquiryYes && (
              <div className={fieldClass("enquiryNumber")}>
                <label>{mandatoryLabel("Enquiry Number")}</label>
                <input name="enquiryNumber" value={form.enquiryNumber} onChange={handleChange} />
                {errorText("enquiryNumber")}
              </div>
            )}
          </div>

          <div className="form-section-title premium-section-title">
            <span>03</span> Material Details
          </div>

          <div className="sales-form-grid">
            <div className={fieldClass("sizeGradeQuantityRate", "sales-full-width")}>
              <label>{mandatoryLabel("Size / Grade / Qty / Rate")}</label>
              <textarea
                name="sizeGradeQuantityRate"
                value={form.sizeGradeQuantityRate}
                onChange={handleChange}
                rows={8}
              />
              {errorText("sizeGradeQuantityRate")}
            </div>

            <div className={fieldClass("supplyCondition")}>
              <label>{mandatoryLabel("Supply Condition")}</label>
              <select name="supplyCondition" value={form.supplyCondition} onChange={handleChange}>
                <option value="as_per_standard">As Per Standard Size</option>
                <option value="other">Other</option>
              </select>
              {errorText("supplyCondition")}
            </div>

            {isOtherSupplyCondition && (
              <div className={fieldClass("otherSupplyConditions")}>
                <label>{mandatoryLabel("Other Supply Conditions")}</label>
                <input name="otherSupplyConditions" value={form.otherSupplyConditions} onChange={handleChange} />
                {errorText("otherSupplyConditions")}
              </div>
            )}

            <div className={fieldClass("cutLengthRequired")}>
              <label>{mandatoryLabel("Cut Length Required")}</label>
              <select name="cutLengthRequired" value={form.cutLengthRequired} onChange={handleChange}>
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errorText("cutLengthRequired")}
            </div>

            <div className={fieldClass("cuttingCost")}>
              <label>{mandatoryLabel("Cutting Cost")}</label>
              <select name="cuttingCost" value={form.cuttingCost} onChange={handleChange}>
                <option value="">Select</option>
                <option value="extra">Extra</option>
                <option value="inclusive">Inclusive</option>
              </select>
              {errorText("cuttingCost")}
            </div>

            <div className={fieldClass("freight")}>
              <label>{mandatoryLabel("Freight")}</label>
              <select name="freight" value={form.freight} onChange={handleChange}>
                <option value="">Select</option>
                <option value="extra">Extra</option>
                <option value="self">Self-Pickup</option>
                <option value = "inclusive">Inclusive</option>
              </select>
              {errorText("freight")}
            </div>

            <div className={fieldClass("tolerance")}>
              <label>{mandatoryLabel("Tolerance")}</label>
              <input name="tolerance" value={form.tolerance} onChange={handleChange} />
              {errorText("tolerance")}
            </div>

            <div className={fieldClass("endUseOfCustomer")}>
              <label>{mandatoryLabel("End Use Of Customer")}</label>
              <select name="endUseOfCustomer" value={form.endUseOfCustomer} onChange={handleChange}>
                <option value="">Select</option>
                <option value="machining">Machining</option>
                <option value="forging">Forging</option>
              </select>
              {errorText("endUseOfCustomer")}
            </div>

            <div className={fieldClass("deliveryTime")}>
              <label>{mandatoryLabel("Delivery Time")}</label>
              <input name="deliveryTime" value={form.deliveryTime} onChange={handleChange} />
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
            <div className={fieldClass("contactPersonName")}>
              <label>{mandatoryLabel("Contact Person Name")}</label>
              <input name="contactPersonName" value={form.contactPersonName} onChange={handleChange} />
              {errorText("contactPersonName")}
            </div>

            <div className={fieldClass("contactPersonNumber")}>
              <label>{mandatoryLabel("Contact Person Number")}</label>
              <input name="contactPersonNumber" value={form.contactPersonNumber} onChange={handleChange} maxLength={10} />
              {errorText("contactPersonNumber")}
            </div>

            <div className={fieldClass("contactPersonEmail")}>
              <label>Contact Person Email</label>
              <input type="email" name="contactPersonEmail" value={form.contactPersonEmail} onChange={handleChange} />
              {errorText("contactPersonEmail")}
            </div>
          </div>

          {pdfGenerating && <div className="pdf-generation-box">Generating final Sales Order PDF...</div>}

          {pdfUrl && (
            <div className="pdf-ready-box">
              PDF generated successfully.{" "}
              <a href={pdfUrl} target="_blank" rel="noreferrer">Open PDF</a>
            </div>
          )}

          <div className="sales-form-actions">
            <button type="button" className="sales-cancel-btn" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" className="sales-submit-btn" disabled={isSubmitting || pdfGenerating}>
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
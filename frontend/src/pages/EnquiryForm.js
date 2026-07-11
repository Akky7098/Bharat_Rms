import React, { useEffect, useMemo, useState } from "react";
import { createEnquiry, getProductConfig } from "../services/enquiryForm";
import "./EnquiryForm.css";

const shapeOptions = [
  { value: "round", label: "Round" },
  { value: "flat", label: "Flat" },
  { value: "square", label: "Square" },
  { value: "rcs", label: "RCS" },
];

const supplyConditionOptions = [
  { value: "as_per_standard", label: "As Per Standard" },
  { value: "as_rolled", label: "As Rolled" },
  { value: "as_forged", label: "As Forged" },
  { value: "as_rolled_or_as_forged", label: "As Rolled / As Forged" },
  { value: "as_rolled_annealed", label: "As Rolled + Annealed" },
  { value: "as_forged_annealed", label: "As Forged + Annealed" },
  { value: "as_rolled_or_forged_annealed", label: "As Rolled / Forged + Annealed" },
  { value: "as_rolled_normalised", label: "As Rolled + Normalised" },
  { value: "as_rolled_or_as_forged_normalised", label: "As Rolled / As Forged + Normalised" },
  { value: "as_rolled_qt", label: "As Rolled + Q&T" },
  { value: "as_forged_qt", label: "As Forged + Q&T" },
  { value: "as_rolled_or_as_forged_qt", label: "As Rolled / As Forged + Q&T" },

  { value: "hot_rolled", label: "Hot Rolled" },
  { value: "hot_rolled_annealed", label: "Hot Rolled + Annealed" },
  { value: "hot_rolled_normalized", label: "Hot Rolled + Normalized" },
  { value: "hot_rolled_qt_ht", label: "Hot Rolled + Q&T / HT" },
  { value: "hot_rolled_annealed_cold_drawn", label: "Hot Rolled + Annealed + Cold Drawn" },
  { value: "hot_rolled_annealed_peeled", label: "Hot Rolled + Annealed + Peeled" },
  { value: "hot_rolled_normalized_peeled", label: "Hot Rolled + Normalized + Peeled" },
  { value: "hot_rolled_normalized_cold_drawn", label: "Hot Rolled + Normalized + Cold Drawn" },
  { value: "hot_rolled_annealed_qt_ht", label: "Hot Rolled + Annealed + Q&T / HT" },
  { value: "hot_rolled_normalized_qt_ht", label: "Hot Rolled + Normalized + Q&T / HT" },
  { value: "hot_rolled_qt_peeled", label: "Hot Rolled + Q&T + Peeled" },
  { value: "double_rolled_condition", label: "Double Rolled Condition" },

  { value: "hot_forged", label: "Hot Forged" },
  { value: "hot_forged_annealed", label: "Hot Forged + Annealed" },
  { value: "hot_forged_normalized", label: "Hot Forged + Normalized" },
  { value: "hot_forged_annealed_machined", label: "Hot Forged + Annealed + Machined" },
  { value: "hot_forged_normalized_machined", label: "Hot Forged + Normalized + Machined" },
  { value: "hot_forged_qt_ht", label: "Hot Forged + Q&T / HT" },
  { value: "hot_forged_qt_ht_machined", label: "Hot Forged + Q&T / HT + Machined" },
  { value: "hot_forged_rolled", label: "Hot Forged + Rolled" },

  { value: "other", label: "Other / Manual" },
];

const modeOfEnquiryOptions = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "Whatsapp" },
  { value: "website", label: "Website" },
  { value: "walk-in", label: "Walk-In" },
  { value: "google-ads", label: "Google Ads" },
  { value: "reference", label: "Reference" },
];

const today = new Date().toISOString().split("T")[0];
const RequiredStar = () => <span className="required-star">*</span>;

const EnquiryForm = ({ onClose, refresh }) => {
  const [form, setForm] = useState({
    enquiryDate: today,
    companyName: "",
    customerName: "",
    customerContactNo: "",
    customerEmailId: "",
    customerAddress: "",
    productCategory: "",
    grade: "",
    shape: "",
    size: "",
    quantityInKg: "",
    supplyCondition: "",
    otherSupplyConditions: "",
    modeOfEnquiry: "",
  });

  const [sizePdf, setSizePdf] = useState(null);
  const [productConfig, setProductConfig] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    loadProductConfig();
  }, []);

  const loadProductConfig = async () => {
    try {
      const data = await getProductConfig();
      setProductConfig(data || {});
    } catch (error) {
      alert("Unable to load product list");
    } finally {
      setLoadingConfig(false);
    }
  };

  const productKeys = useMemo(() => Object.keys(productConfig || {}), [productConfig]);
  const gradeOptions = productConfig[form.productCategory] || [];
  const isOtherProduct = form.productCategory === "other";

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "productCategory") {
      setForm((prev) => ({
        ...prev,
        productCategory: value,
        grade: "",
      }));
      return;
    }

    if (name === "customerContactNo") {
      const onlyNumbers = value.replace(/\D/g, "");
      setForm((prev) => ({
        ...prev,
        customerContactNo: onlyNumbers.slice(0, 10),
      }));
      return;
    }

    if (name === "supplyCondition") {
      setForm((prev) => ({
        ...prev,
        supplyCondition: value,
        otherSupplyConditions:
          value === "other" ? prev.otherSupplyConditions : "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateField = (name, value) => {
    handleChange({ target: { name, value } });
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setSizePdf(null);
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Only PDF file is allowed");
      e.target.value = "";
      setSizePdf(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("PDF size should not be more than 5MB");
      e.target.value = "";
      setSizePdf(null);
      return;
    }

    setSizePdf(file);
  };

  const validateForm = () => {
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

   if (!form.enquiryDate) {
  alert("Please select enquiry date");
  return false;
}

if (!form.companyName.trim()) {
  alert("Please enter company name");
  return false;
}

if (!form.customerName.trim()) {
  alert("Please enter customer name");
  return false;
}

if (!phoneRegex.test(form.customerContactNo)) {
  alert("Please enter a valid 10 digit phone number");
  return false;
}

if (!form.customerEmailId.trim()) {
  alert("Please enter email id");
  return false;
}

if (!emailRegex.test(form.customerEmailId)) {
  alert("Please enter a valid email id");
  return false;
}

if (!form.customerAddress.trim()) {
  alert("Please enter city / state");
  return false;
}

if (!form.productCategory) {
  alert("Please select product");
  return false;
}

if (!form.grade.trim()) {
  alert("Please enter/select grade");
  return false;
}

if (!form.shape) {
  alert("Please select shape");
  return false;
}

if (!form.size.trim()) {
  alert("Please enter size");
  return false;
}

if (Number(form.quantityInKg) <= 0) {
  alert("Quantity must be greater than 0");
  return false;
}

if (!form.supplyCondition) {
  alert("Please select supply condition");
  return false;
}

if (
  form.supplyCondition === "other" &&
  !form.otherSupplyConditions.trim()
) {
  alert("Please enter other supply condition");
  return false;
}

if (!form.modeOfEnquiry) {
  alert("Please select mode of enquiry");
  return false;
}

return true;

  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        quantityInKg: Number(form.quantityInKg),
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));

      if (sizePdf) {
        formData.append("sizePdf", sizePdf);
      }

      await createEnquiry(formData);

      alert("Enquiry created successfully");
      refresh();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create enquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="enquiry-modal-overlay">
      {/* DESKTOP WEBSITE FORM - OLD CLASSES KEPT */}
      <div className="enquiry-form-card enquiry-form-desktop-card">
        <div className="enquiry-form-header">
          <div>
            <h2>New Enquiry</h2>
            <p>Create customer enquiry record</p>
          </div>

          <button type="button" className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mobile-form-note">
            Fields marked with <span className="required-star">*</span> are mandatory.
          </div>

          <h3 className="form-section-title">Customer Details</h3>

          <div className="enquiry-form-grid">
            <div className="form-group">
              <label>Enquiry Date <RequiredStar /></label>
              <div className="readonly-date-box">
                {new Date(form.enquiryDate).toLocaleDateString("en-GB").replaceAll("/", "-")}
              </div>
              <small className="auto-date-note">Auto set on submission</small>
            </div>

            <div className="form-group">
              <label>Company Name <RequiredStar /></label>
              <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="Enter company name" autoFocus required />
            </div>

            <div className="form-group">
              <label>Customer Name <RequiredStar /></label>
              <input name="customerName" value={form.customerName} onChange={handleChange} placeholder="Enter customer name" required />
            </div>

            <div className="form-group">
              <label>Contact No <RequiredStar /></label>
              <input type="tel" inputMode="numeric" name="customerContactNo" value={form.customerContactNo} onChange={handleChange} placeholder="10 digit mobile no" maxLength="10" required />
            </div>

            <div className="form-group">
              <label>Email ID <RequiredStar /></label>
              <input type="email" name="customerEmailId" value={form.customerEmailId} onChange={handleChange} placeholder="Enter email id" required />
            </div>

            <div className="form-group">
              <label>City / State <RequiredStar /></label>
              <input name="customerAddress" value={form.customerAddress} onChange={handleChange} placeholder="City, State" required />
            </div>
          </div>

          <h3 className="form-section-title">Product Requirement</h3>

          <div className="enquiry-form-grid">
            <div className="form-group">
              <label>Product <RequiredStar /></label>
              <select name="productCategory" value={form.productCategory} onChange={handleChange} required>
                <option value="">Select product</option>
                {productKeys.map((key) => (
                  <option key={key} value={key}>
                    {key.replaceAll("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className={`form-group ${isOtherProduct ? "grade-text-box" : ""}`}>
              <label>Grade <RequiredStar /></label>
              {isOtherProduct ? (
                <textarea name="grade" value={form.grade} onChange={handleChange} placeholder="Enter custom grade details" required />
              ) : (
                <select name="grade" value={form.grade} onChange={handleChange} disabled={!form.productCategory} required>
                  <option value="">Select grade</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Shape <RequiredStar /></label>
              <select name="shape" value={form.shape} onChange={handleChange} required>
                <option value="">Select shape</option>
                {shapeOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Size <RequiredStar /></label>
              <input name="size" value={form.size} onChange={handleChange} placeholder="Example: 50 Dia x 5000 Long" required />
            </div>

            <div className="form-group">
              <label>Quantity Kg <RequiredStar /></label>
              <input type="number" inputMode="decimal" name="quantityInKg" value={form.quantityInKg} onChange={handleChange} placeholder="Enter quantity" min="1" required />
            </div>

            <div className="form-group">
              <label>Supply Condition <RequiredStar /></label>
              <select name="supplyCondition" value={form.supplyCondition} onChange={handleChange} required>
                <option value="">Select supply condition</option>
                {supplyConditionOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            {form.supplyCondition === "other" && (
              <div className="form-group full-width other-supply-condition-box">
                <label>Other Supply Condition <RequiredStar /></label>
                <textarea
                  name="otherSupplyConditions"
                  value={form.otherSupplyConditions}
                  onChange={handleChange}
                  placeholder="Write manual supply condition"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Mode Of Enquiry <RequiredStar /></label>
              <select name="modeOfEnquiry" value={form.modeOfEnquiry} onChange={handleChange} required>
                <option value="">Select mode</option>
                {modeOfEnquiryOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Size PDF Upload</label>
              <div className="size-pdf-upload-box">
                <input type="file" id="sizePdfDesktop" accept="application/pdf" onChange={handlePdfChange} />

                <label htmlFor="sizePdfDesktop" className="size-pdf-label">
                  <span className="upload-title">
                    {sizePdf ? sizePdf.name : "Upload size PDF if size details are long"}
                  </span>
                  <span className="upload-subtitle">Optional field · PDF only · Max 5MB</span>
                </label>

                {sizePdf && (
                  <button type="button" className="remove-file-btn" onClick={() => setSizePdf(null)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Enquiry"}
            </button>
          </div>
        </form>
      </div>

      {/* iOS PWA FORM - ISOLATED CLASSES ONLY */}
      <div className="ios-enquiry-form-card">
        <div className="ios-enquiry-form-header">
          <div>
            <h2>New Enquiry</h2>
            <p>Create customer enquiry record</p>
          </div>

          <button type="button" onClick={onClose}>×</button>
        </div>

        {loadingConfig ? (
          <div className="ios-enquiry-form-loading">
            Loading product configuration...
          </div>
        ) : (
          <form className="ios-enquiry-form-body" onSubmit={handleSubmit}>
            <div className="ios-enquiry-form-note">
              Fields marked with * are mandatory.
            </div>

            <IosSection title="Customer Details" />

            <IosReadOnlyField
              label="Enquiry Date *"
              value={new Date(form.enquiryDate).toLocaleDateString("en-GB")}
            />

            <IosInput label="Company Name *" value={form.companyName} onChange={(v) => updateField("companyName", v)} placeholder="Enter company name" />
            <IosInput label="Customer Name *" value={form.customerName} onChange={(v) => updateField("customerName", v)} placeholder="Enter customer name" />
            <IosInput label="Contact No *" type="tel" inputMode="numeric" maxLength="10" value={form.customerContactNo} onChange={(v) => updateField("customerContactNo", v)} placeholder="10 digit mobile no" />
            <IosInput label="Email ID *" type="email" value={form.customerEmailId} onChange={(v) => updateField("customerEmailId", v)} placeholder="Enter email id" />
            <IosInput label="City / State *" value={form.customerAddress} onChange={(v) => updateField("customerAddress", v)} placeholder="City, State" />

            <IosSection title="Product Requirement" />

            <IosOptionGroup
              label="Product *"
              options={productKeys.map((key) => ({
                value: key,
                label: key.replaceAll("_", " ").toUpperCase(),
              }))}
              value={form.productCategory}
              onSelect={(v) => updateField("productCategory", v)}
            />

            {isOtherProduct ? (
              <IosInput
                label="Grade *"
                value={form.grade}
                onChange={(v) => updateField("grade", v)}
                placeholder="Enter custom grade details"
                textarea
              />
            ) : (
              <IosOptionGroup
                label="Grade *"
                options={gradeOptions.map((grade) => ({ value: grade, label: grade }))}
                value={form.grade}
                onSelect={(v) => updateField("grade", v)}
                disabled={!form.productCategory}
              />
            )}

            <IosOptionGroup
              label="Shape *"
              options={shapeOptions}
              value={form.shape}
              onSelect={(v) => updateField("shape", v)}
            />

            <IosInput label="Size *" value={form.size} onChange={(v) => updateField("size", v)} placeholder="Example: 50 Dia x 5000 Long" />
            <IosInput label="Quantity Kg *" type="number" inputMode="decimal" value={form.quantityInKg} onChange={(v) => updateField("quantityInKg", v)} placeholder="Enter quantity" />

            <IosOptionGroup
              label="Supply Condition *"
              options={supplyConditionOptions}
              value={form.supplyCondition}
              onSelect={(v) => updateField("supplyCondition", v)}
            />

            {form.supplyCondition === "other" && (
              <IosInput
                label="Other Supply Condition *"
                value={form.otherSupplyConditions}
                onChange={(v) => updateField("otherSupplyConditions", v)}
                placeholder="Write manual supply condition"
                textarea
              />
            )}

            <IosOptionGroup
              label="Mode Of Enquiry *"
              options={modeOfEnquiryOptions}
              value={form.modeOfEnquiry}
              onSelect={(v) => updateField("modeOfEnquiry", v)}
            />

            <label className="ios-enquiry-form-label">Size PDF Upload</label>
            <div className="ios-enquiry-upload-box">
              <input type="file" id="sizePdfMobile" accept="application/pdf" onChange={handlePdfChange} />

              <label htmlFor="sizePdfMobile">
                <strong>
                  {sizePdf ? sizePdf.name : "Upload size PDF if size details are long"}
                </strong>
                <span>Optional · PDF only · Max 5MB</span>
              </label>
            </div>

            {sizePdf && (
              <button type="button" className="ios-enquiry-remove-file" onClick={() => setSizePdf(null)}>
                Remove PDF
              </button>
            )}

            <div className="ios-enquiry-form-actions">
              <button type="button" onClick={onClose}>
                Cancel
              </button>

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Enquiry"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

function IosSection({ title }) {
  return <h3 className="ios-enquiry-form-section">{title}</h3>;
}

function IosInput({ label, value, onChange, textarea, ...props }) {
  return (
    <div className="ios-enquiry-form-field">
      <label>{label}</label>

      {textarea ? (
        <textarea
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function IosReadOnlyField({ label, value }) {
  return (
    <div className="ios-enquiry-form-field">
      <label>{label}</label>
      <div className="ios-enquiry-readonly-box">{value}</div>
    </div>
  );
}

function IosOptionGroup({ label, options, value, onSelect, disabled }) {
  return (
    <div className="ios-enquiry-form-field">
      <label>{label}</label>

      <div className="ios-enquiry-chip-wrap">
        {disabled ? (
          <span className="ios-enquiry-disabled-text">Select product first</span>
        ) : (
          options.map((item) => {
            const active = value === item.value;

            return (
              <button
                type="button"
                key={item.value}
                className={`ios-enquiry-chip ${active ? "active" : ""}`}
                onClick={() => onSelect(item.value)}
              >
                {item.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EnquiryForm;
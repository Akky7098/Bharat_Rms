import React, { useEffect, useState } from "react";
import { createEnquiry, getProductConfig } from "../services/enquiryForm";
import "./EnquiryForm.css";

const shapeOptions = [
  { value: "round", label: "Round" },
  { value: "flat", label: "Flat" },
  { value: "square", label: "Square" },
];

const supplyConditionOptions = [
  { value: "as_per_standard", label: "As Per Standard" },

  { value: "as_rolled", label: "As Rolled" },
  { value: "as_forged", label: "As Forged" },

  {
    value: "as_rolled_or_as_forged",
    label: "As Rolled / As Forged",
  },

  {
    value: "as_rolled_annealed",
    label: "As Rolled + Annealed",
  },

  {
    value: "as_forged_annealed",
    label: "As Forged + Annealed",
  },

  {
    value: "as_rolled_or_forged_annealed",
    label: "As Rolled / Forged + Annealed",
  },

  {
    value: "as_rolled_normalised",
    label: "As Rolled + Normalised",
  },

  {
    value: "as_rolled_or_as_forged_normalised",
    label: "As Rolled / As Forged + Normalised",
  },

  {
    value: "as_rolled_qt",
    label: "As Rolled + Q&T",
  },

  {
    value: "as_forged_qt",
    label: "As Forged + Q&T",
  },

  {
    value: "as_rolled_or_as_forged_qt",
    label: "As Rolled / As Forged + Q&T",
  },

  {
    value: "other",
    label: "Others",
  },
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

const RequiredStar = () => <span className="required-star">*</span>;
const today = new Date().toISOString().split("T")[0];
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
    modeOfEnquiry: "",
  });

  const [sizePdf, setSizePdf] = useState(null);
  const [productConfig, setProductConfig] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProductConfig();
  }, []);

  const loadProductConfig = async () => {
    try {
      const data = await getProductConfig();
      setProductConfig(data || {});
    } catch (error) {
      alert("Unable to load product list");
    }
  };

  const isOtherProduct = form.productCategory === "other";

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "productCategory") {
      setForm({
        ...form,
        productCategory: value,
        grade: "",
      });
      return;
    }

    if (name === "customerContactNo") {
      const onlyNumbers = value.replace(/\D/g, "");
      setForm({
        ...form,
        customerContactNo: onlyNumbers.slice(0, 10),
      });
      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
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
      <div className="enquiry-form-card">
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
  <label>
    Enquiry Date <RequiredStar />
  </label>

  <div className="readonly-date-box">
    {new Date(form.enquiryDate).toLocaleDateString("en-GB").replaceAll("/", "-")}
  </div>

  <small className="auto-date-note">Auto set on submission</small>
</div>

            <div className="form-group">
              <label>
                Company Name <RequiredStar />
              </label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="Enter company name"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label>
                Customer Name <RequiredStar />
              </label>
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Contact No <RequiredStar />
              </label>
              <input
                type="tel"
                inputMode="numeric"
                name="customerContactNo"
                value={form.customerContactNo}
                onChange={handleChange}
                placeholder="10 digit mobile no"
                maxLength="10"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Email ID <RequiredStar />
              </label>
              <input
                type="email"
                name="customerEmailId"
                value={form.customerEmailId}
                onChange={handleChange}
                placeholder="Enter email id"
                required
              />
            </div>

            <div className="form-group">
              <label>
                City / State <RequiredStar />
              </label>
              <input
                name="customerAddress"
                value={form.customerAddress}
                onChange={handleChange}
                placeholder="City, State"
                required
              />
            </div>
          </div>

          <h3 className="form-section-title">Product Requirement</h3>

          <div className="enquiry-form-grid">
            <div className="form-group">
              <label>
                Product <RequiredStar />
              </label>
              <select
                name="productCategory"
                value={form.productCategory}
                onChange={handleChange}
                required
              >
                <option value="">Select product</option>
                {Object.keys(productConfig).map((key) => (
                  <option key={key} value={key}>
                    {key.replaceAll("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className={`form-group ${isOtherProduct ? "grade-text-box" : ""}`}>
              <label>
                Grade <RequiredStar />
              </label>

              {isOtherProduct ? (
                <textarea
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  placeholder="Enter custom grade details"
                  required
                />
              ) : (
                <select
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  disabled={!form.productCategory}
                  required
                >
                  <option value="">Select grade</option>
                  {(productConfig[form.productCategory] || []).map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>
                Shape <RequiredStar />
              </label>
              <select
                name="shape"
                value={form.shape}
                onChange={handleChange}
                required
              >
                <option value="">Select shape</option>
                {shapeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Size <RequiredStar />
              </label>
              <input
                name="size"
                value={form.size}
                onChange={handleChange}
                placeholder="Example: 50 Dia x 5000 Long"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Quantity Kg <RequiredStar />
              </label>
              <input
                type="number"
                inputMode="decimal"
                name="quantityInKg"
                value={form.quantityInKg}
                onChange={handleChange}
                placeholder="Enter quantity"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Supply Condition <RequiredStar />
              </label>
              <select
                name="supplyCondition"
                value={form.supplyCondition}
                onChange={handleChange}
                required
              >
                <option value="">Select supply condition</option>
                {supplyConditionOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Mode Of Enquiry <RequiredStar />
              </label>
              <select
                name="modeOfEnquiry"
                value={form.modeOfEnquiry}
                onChange={handleChange}
                required
              >
                <option value="">Select mode</option>
                {modeOfEnquiryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Size PDF Upload</label>

              <div className="size-pdf-upload-box">
                <input
                  type="file"
                  id="sizePdf"
                  accept="application/pdf"
                  onChange={handlePdfChange}
                />

                <label htmlFor="sizePdf" className="size-pdf-label">
                  <span className="upload-title">
                    {sizePdf ? sizePdf.name : "Upload size PDF if size details are long"}
                  </span>
                  <span className="upload-subtitle">
                    Optional field · PDF only · Max 5MB
                  </span>
                </label>

                {sizePdf && (
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={() => setSizePdf(null)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Enquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnquiryForm;
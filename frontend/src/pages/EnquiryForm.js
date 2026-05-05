import React, { useEffect, useState } from "react";
import { createEnquiry, getProductConfig } from "../services/enquiryForm";
import "./EnquiryForm.css";

const EnquiryForm = ({ onClose, refresh }) => {
  const [form, setForm] = useState({
    enquiryDate: "",
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

  const validateForm = () => {
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.grade.trim()) {
      alert("Please enter/select grade");
      return false;
    }

    if (!phoneRegex.test(form.customerContactNo)) {
      alert("Please enter a valid 10 digit phone number");
      return false;
    }

    if (form.customerEmailId && !emailRegex.test(form.customerEmailId)) {
      alert("Please enter a valid email id");
      return false;
    }

    if (Number(form.quantityInKg) <= 0) {
      alert("Quantity must be greater than 0");
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
      await createEnquiry({
        ...form,
        quantityInKg: Number(form.quantityInKg),
      });

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
            Fill customer details first, then product requirement.
          </div>

          <h3 className="form-section-title">Customer Details</h3>

          <div className="enquiry-form-grid">
            <div className="form-group">
              <label>Enquiry Date</label>
              <input
                type="date"
                name="enquiryDate"
                value={form.enquiryDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Company Name</label>
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
              <label>Customer Name</label>
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div className="form-group">
              <label>Contact No</label>
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
              <label>Email ID</label>
              <input
                type="email"
                name="customerEmailId"
                value={form.customerEmailId}
                onChange={handleChange}
                placeholder="Enter email id"
              />
            </div>

            <div className="form-group">
              <label>City / State</label>
              <input
                name="customerAddress"
                value={form.customerAddress}
                onChange={handleChange}
                placeholder="City, State"
              />
            </div>
          </div>

          <h3 className="form-section-title">Product Requirement</h3>

          <div className="enquiry-form-grid">
            <div className="form-group">
              <label>Product</label>
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
              <label>Grade</label>

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
                  <option value="">Select Grade</option>
                  {(productConfig[form.productCategory] || []).map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Shape</label>
              <input
                name="shape"
                value={form.shape}
                onChange={handleChange}
                placeholder="Round / Flat / Plate"
                required
              />
            </div>

            <div className="form-group">
              <label>Size</label>
              <input
                name="size"
                value={form.size}
                onChange={handleChange}
                placeholder="Example: 50mm"
                required
              />
            </div>

            <div className="form-group">
              <label>Quantity Kg</label>
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
              <label>Supply Condition</label>
              <input
                name="supplyCondition"
                value={form.supplyCondition}
                onChange={handleChange}
                placeholder="Annealed / Hardened"
              />
            </div>

            <div className="form-group full-width">
              <label>Mode Of Enquiry</label>
              <select
                name="modeOfEnquiry"
                value={form.modeOfEnquiry}
                onChange={handleChange}
                required
              >
                <option value="">Select mode</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="whatsapp">Whatsapp</option>
                <option value="website">Website</option>
                <option value="walk-in">Walk-In</option>
                <option value="reference">Reference</option>
              </select>
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
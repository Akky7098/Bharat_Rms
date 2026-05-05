import React, { useEffect, useState } from "react";
import {
  createSalesOrder,
  getProductConfig,
} from "../services/salesOrderService";
import "./SalesOrderForm.css";

const SalesOrderForm = ({ onClose, refresh }) => {
  const [form, setForm] = useState({
    orderDate: "",
    companyName: "",
    location: "",
    contactPersonName: "",
    contactPersonNumber: "",
    contactPersonEmailId: "",
    productCategory: "",
    grade: "",
    size: "",
    quantityInKg: "",
    valueInRupees: "",
    paymentTerms: "",
  });

  const [productConfig, setProductConfig] = useState({});
  const [grades, setGrades] = useState([]);
  const [errors, setErrors] = useState({});
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

  const validateField = (name, value) => {
    let error = "";

    if (name === "contactPersonName") {
      if (!value.trim()) {
        error = "Contact person name is required";
      } else if (/\d/.test(value)) {
        error = "Contact person name cannot contain numbers";
      }
    }

    if (name === "contactPersonNumber") {
      if (!/^[0-9]{10}$/.test(value)) {
        error = "Contact number must be exactly 10 digits";
      }
    }

    if (name === "contactPersonEmailId") {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = "Please enter a valid email address";
      }
    }

    if (name === "grade") {
      if (!value.trim()) {
        error = "Grade is required";
      }
    }

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "productCategory") {
      setGrades(productConfig[value] || []);
      setForm((prev) => ({
        ...prev,
        productCategory: value,
        grade: "",
      }));

      setErrors((prev) => ({
        ...prev,
        grade: "",
      }));
      return;
    }

    if (name === "contactPersonNumber") {
      const onlyNumbers = value.replace(/\D/g, "").slice(0, 10);

      setForm((prev) => ({
        ...prev,
        contactPersonNumber: onlyNumbers,
      }));

      validateField(name, onlyNumbers);
      return;
    }

    if (name === "contactPersonName") {
      const onlyLetters = value.replace(/[0-9]/g, "");

      setForm((prev) => ({
        ...prev,
        contactPersonName: onlyLetters,
      }));

      validateField(name, onlyLetters);
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    validateField(name, value);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.contactPersonName.trim()) {
      newErrors.contactPersonName = "Contact person name is required";
    } else if (/\d/.test(form.contactPersonName)) {
      newErrors.contactPersonName = "Contact person name cannot contain numbers";
    }

    if (!/^[0-9]{10}$/.test(form.contactPersonNumber)) {
      newErrors.contactPersonNumber = "Contact number must be exactly 10 digits";
    }

    if (
      form.contactPersonEmailId &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactPersonEmailId)
    ) {
      newErrors.contactPersonEmailId = "Please enter a valid email address";
    }

    if (!form.grade.trim()) {
      newErrors.grade = "Grade is required";
    }

    if (Number(form.quantityInKg) <= 0) {
      newErrors.quantityInKg = "Quantity must be greater than 0";
    }

    if (Number(form.valueInRupees) <= 0) {
      newErrors.valueInRupees = "Value must be greater than 0";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await createSalesOrder({
        ...form,
        grade: form.grade.trim(),
        quantityInKg: Number(form.quantityInKg),
        valueInRupees: Number(form.valueInRupees),
      });

      alert("Sales order created successfully");
      refresh();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create sales order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sales-form-overlay">
      <div className="sales-form-card">
        <div className="sales-form-header">
          <div>
            <h2>New Sales Order</h2>
            <p>Create customer sales order record</p>
          </div>

          <button type="button" className="sales-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sales-form-grid">
            <div className="sales-form-group">
              <label>Order Date</label>
              <input
                type="date"
                name="orderDate"
                value={form.orderDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="sales-form-group">
              <label>Company Name</label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="Enter company name"
                required
              />
            </div>

            <div className="sales-form-group">
              <label>Location</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="City, State"
                required
              />
            </div>

            <div className="sales-form-group">
              <label>Contact Person Name</label>
              <input
                name="contactPersonName"
                value={form.contactPersonName}
                onChange={handleChange}
                placeholder="Enter contact person name"
                required
              />
              {errors.contactPersonName && (
                <small className="sales-field-error">
                  {errors.contactPersonName}
                </small>
              )}
            </div>

            <div className="sales-form-group">
              <label>Contact Person Number</label>
              <input
                name="contactPersonNumber"
                value={form.contactPersonNumber}
                onChange={handleChange}
                placeholder="10 digit mobile no"
                maxLength="10"
                required
              />
              {errors.contactPersonNumber && (
                <small className="sales-field-error">
                  {errors.contactPersonNumber}
                </small>
              )}
            </div>

            <div className="sales-form-group">
              <label>Contact Person Email ID</label>
              <input
                type="email"
                name="contactPersonEmailId"
                value={form.contactPersonEmailId}
                onChange={handleChange}
                placeholder="Enter email id"
              />
              {errors.contactPersonEmailId && (
                <small className="sales-field-error">
                  {errors.contactPersonEmailId}
                </small>
              )}
            </div>

            <div className="sales-form-group">
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

            <div
              className={`sales-form-group ${
                isOtherProduct ? "sales-grade-text-box" : ""
              }`}
            >
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
                  <option value="">Select grade</option>
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              )}

              {errors.grade && (
                <small className="sales-field-error">{errors.grade}</small>
              )}
            </div>

            <div className="sales-form-group sales-full-width">
              <label>Size</label>
              <textarea
                name="size"
                value={form.size}
                onChange={handleChange}
                placeholder="Example: Round 50mm x 1000mm, Flat 100 x 25mm"
                required
              />
            </div>

            <div className="sales-form-group">
              <label>Quantity In Kg</label>
              <input
                type="number"
                name="quantityInKg"
                value={form.quantityInKg}
                onChange={handleChange}
                placeholder="Enter quantity"
                required
              />
              {errors.quantityInKg && (
                <small className="sales-field-error">
                  {errors.quantityInKg}
                </small>
              )}
            </div>

            <div className="sales-form-group">
              <label>Value In Rupees</label>
              <input
                type="number"
                name="valueInRupees"
                value={form.valueInRupees}
                onChange={handleChange}
                placeholder="Enter order value"
                required
              />
              {errors.valueInRupees && (
                <small className="sales-field-error">
                  {errors.valueInRupees}
                </small>
              )}
            </div>

            <div className="sales-form-group sales-full-width">
              <label>Payment Terms</label>
              <textarea
                name="paymentTerms"
                value={form.paymentTerms}
                onChange={handleChange}
                placeholder="Example: 50% advance, 50% before dispatch"
                required
              />
            </div>
          </div>

          <div className="sales-form-actions">
            <button type="button" className="sales-cancel-btn" onClick={onClose}>
              Cancel
            </button>

            <button
              type="submit"
              className="sales-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Sales Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesOrderForm;
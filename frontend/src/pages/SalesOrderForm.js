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
    ratePerKg: "",
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

  const calculateRatePerKg = (quantity, value) => {
    const qty = Number(quantity || 0);
    const total = Number(value || 0);

    if (qty > 0 && total > 0) {
      return Number((total / qty).toFixed(2));
    }

    return "";
  };

  const updateFormWithRate = (updatedFields) => {
    setForm((prev) => {
      const updated = {
        ...prev,
        ...updatedFields,
      };

      updated.ratePerKg = calculateRatePerKg(
        updated.quantityInKg,
        updated.valueInRupees
      );

      return updated;
    });
  };

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

    if (name === "quantityInKg") {
      if (Number(value) <= 0) {
        error = "Quantity must be greater than 0";
      }
    }

    if (name === "valueInRupees") {
      if (Number(value) <= 0) {
        error = "Value must be greater than 0";
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

      updateFormWithRate({
        productCategory: value,
        grade: "",
      });

      setErrors((prev) => ({
        ...prev,
        grade: "",
      }));

      return;
    }

    if (name === "contactPersonNumber") {
      const onlyNumbers = value.replace(/\D/g, "").slice(0, 10);

      updateFormWithRate({
        contactPersonNumber: onlyNumbers,
      });

      validateField(name, onlyNumbers);
      return;
    }

    if (name === "contactPersonName") {
      const onlyLetters = value.replace(/[0-9]/g, "");

      updateFormWithRate({
        contactPersonName: onlyLetters,
      });

      validateField(name, onlyLetters);
      return;
    }

    updateFormWithRate({
      [name]: value,
    });

    validateField(name, value);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.orderDate) {
      newErrors.orderDate = "Order date is required";
    }

    if (!form.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }

    if (!form.location.trim()) {
      newErrors.location = "Location is required";
    }

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

    if (!form.productCategory) {
      newErrors.productCategory = "Product is required";
    }

    if (!form.grade.trim()) {
      newErrors.grade = "Grade is required";
    }

    if (!form.size.trim()) {
      newErrors.size = "Size is required";
    }

    if (Number(form.quantityInKg) <= 0) {
      newErrors.quantityInKg = "Quantity must be greater than 0";
    }

    if (Number(form.valueInRupees) <= 0) {
      newErrors.valueInRupees = "Value must be greater than 0";
    }

    if (Number(form.ratePerKg) <= 0) {
      newErrors.ratePerKg = "Rate per kg could not be calculated";
    }


    if (!form.paymentTerms.trim()) {
      newErrors.paymentTerms = "Payment terms are required";
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
  ratePerKg: Number(form.ratePerKg),
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
              {errors.orderDate && (
                <small className="sales-field-error">{errors.orderDate}</small>
              )}
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
              {errors.companyName && (
                <small className="sales-field-error">
                  {errors.companyName}
                </small>
              )}
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
              {errors.location && (
                <small className="sales-field-error">{errors.location}</small>
              )}
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
              {errors.productCategory && (
                <small className="sales-field-error">
                  {errors.productCategory}
                </small>
              )}
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
              {errors.size && (
                <small className="sales-field-error">{errors.size}</small>
              )}
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

            <div className="sales-form-group">
              <label>Rate Per Kg</label>
              <input
                type="number"
                name="ratePerKg"
                value={form.ratePerKg}
                readOnly
                placeholder="Auto calculated"
                className="rate-readonly"
              />
              {errors.ratePerKg && (
                <small className="sales-field-error">{errors.ratePerKg}</small>
              )}
            </div>
            <div className="sales-form-group sales-full-width">
              <label>Payment Terms</label>
              <textarea
                name="paymentTerms"
                value={form.paymentTerms}
                onChange={handleChange}
                placeholder="Example: 50% advance, 50% before dispatch / 45 days PDC"
                required
              />
              {errors.paymentTerms && (
                <small className="sales-field-error">
                  {errors.paymentTerms}
                </small>
              )}
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
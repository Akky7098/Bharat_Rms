import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FlaskConical,
  Loader2,
  Save,
} from "lucide-react";
import "../MtcForm.css";

import {
  createMtcCertificate,
  getMtcChemicalSpecs,
} from "../../services/mtcService";

const initialForm = {
  mtcProvider: "gloria",
  messers: "",
  orderNo: "",
  poNo: "",
  fileNo: "",
  mtcDate: "",
  grade: "",
  weight: "",
  size: "",
  pcs: "",
  heatLotNo: "",
  condition: "HF-Spheroidized Annealed",
  chemicalComposition: {},
};

function GloriaMtcForm({
  onBack,
  onCancel,
  onCreated,
}) {
  const [form, setForm] = useState(initialForm);
  const [chemicalSpecs, setChemicalSpecs] = useState({});
  const [saving, setSaving] = useState(false);
  const [specLoading, setSpecLoading] = useState(true);
  const [error, setError] = useState("");

  const gradeOptions = useMemo(() => Object.keys(chemicalSpecs), [chemicalSpecs]);

  const selectedSpec = useMemo(() => {
    if (!form.grade) return null;
    return chemicalSpecs[form.grade]?.elements || null;
  }, [chemicalSpecs, form.grade]);

  const chemicalElements = useMemo(() => {
    if (!selectedSpec) return [];
    return Object.keys(selectedSpec);
  }, [selectedSpec]);

  const buildChemicalCompositionFromSpecs = (specs, grade) => {
    const elements = specs[grade]?.elements || {};
    const composition = {};

    Object.keys(elements).forEach((element) => {
      const spec = elements[element];
      composition[element] =
        spec.min === null && spec.max === null ? "X" : "";
    });

    return composition;
  };

  useEffect(() => {
    const loadSpecs = async () => {
      try {
        setSpecLoading(true);
        setError("");

        const response = await getMtcChemicalSpecs();
        const specs = response?.data || {};
        const firstGrade = Object.keys(specs)[0] || "";

        setChemicalSpecs(specs);

        if (firstGrade) {
          setForm((prev) => ({
            ...prev,
            grade: firstGrade,
            chemicalComposition: buildChemicalCompositionFromSpecs(
              specs,
              firstGrade
            ),
          }));
        }
      } catch (err) {
        setError("Unable to load MTC chemical specs.");
      } finally {
        setSpecLoading(false);
      }
    };

    loadSpecs();
  }, []);

  const requiredFilled = useMemo(() => {
    return (
      form.orderNo &&
      form.fileNo &&
      form.mtcDate &&
      form.grade &&
      form.weight &&
      form.size &&
      form.pcs &&
      form.heatLotNo &&
      form.condition
    );
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "grade") {
      setForm((prev) => ({
        ...prev,
        grade: value,
        chemicalComposition: buildChemicalCompositionFromSpecs(
          chemicalSpecs,
          value
        ),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChemicalChange = (element, value) => {
    const spec = selectedSpec?.[element];
    const locked = spec?.min === null && spec?.max === null;

    setForm((prev) => ({
      ...prev,
      chemicalComposition: {
        ...prev.chemicalComposition,
        [element]: locked ? "X" : value,
      },
    }));
  };

  const buildPayload = () => ({
    ...form,
    chemicalComposition: chemicalElements.map((element) => ({
      element,
      result: form.chemicalComposition[element],
    })),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (!requiredFilled) {
        setError("Please fill all required MTC details.");
        return;
      }

      setSaving(true);

      const response = await createMtcCertificate(buildPayload());

      if (onCreated) {
        onCreated(response?.data);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to generate MTC certificate."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mtc-form-page">
      <div className="mtc-form-topbar">
        <button type="button" className="mtc-form-back" onClick={onBack}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div>
          <span>Create Certificate</span>
          <h2>New MTC Certificate</h2>
        </div>
      </div>

      {error && <div className="mtc-form-error">{error}</div>}

      {specLoading ? (
        <div className="mtc-form-card">Loading chemical specs...</div>
      ) : (
        <form onSubmit={handleSubmit} className="mtc-premium-form">
          <section className="mtc-form-card">
            <div className="mtc-card-title">
              <div>
                <Building2 size={20} />
              </div>
              <span>
                <h3>Basic Details</h3>
                <p>Fill manual certificate details</p>
              </span>
            </div>

            <div className="mtc-form-grid">
              <div className="mtc-field">
                <label>MTC Provider *</label>
                <select
                  name="mtcProvider"
                  value={form.mtcProvider}
                  onChange={handleChange}
                >
                  <option value="gloria">Gloria</option>
                </select>
              </div>

              <div className="mtc-field">
                <label>Grade *</label>
                <select name="grade" value={form.grade} onChange={handleChange}>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {chemicalSpecs[grade]?.label || grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mtc-field">
                <label>Messers / Company</label>
                <input
                  name="messers"
                  value={form.messers}
                  onChange={handleChange}
                  placeholder="Customer name"
                />
              </div>

              <div className="mtc-field">
                <label>Order No. *</label>
                <input
                  name="orderNo"
                  value={form.orderNo}
                  onChange={handleChange}
                  placeholder="Order number"
                />
              </div>

              <div className="mtc-field">
                <label>P.O.No.</label>
                <input
                  name="poNo"
                  value={form.poNo}
                  onChange={handleChange}
                  placeholder="PO number"
                />
              </div>

              <div className="mtc-field">
                <label>File No. *</label>
                <input
                  name="fileNo"
                  value={form.fileNo}
                  onChange={handleChange}
                  placeholder="File number"
                />
              </div>

              <div className="mtc-field">
                <label>Date *</label>
                <div className="mtc-input-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    name="mtcDate"
                    value={form.mtcDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mtc-field">
                <label>Weight *</label>
                <input
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                  placeholder="4527 Kgs"
                />
              </div>

              <div className="mtc-field">
                <label>Size *</label>
                <input
                  name="size"
                  value={form.size}
                  onChange={handleChange}
                  placeholder="100x100MM"
                />
              </div>

              <div className="mtc-field">
                <label>Pcs *</label>
                <input
                  name="pcs"
                  value={form.pcs}
                  onChange={handleChange}
                  placeholder="12"
                />
              </div>

              <div className="mtc-field">
                <label>Heat-Lot No. *</label>
                <input
                  name="heatLotNo"
                  value={form.heatLotNo}
                  onChange={handleChange}
                  placeholder="SD6239M4-18"
                />
              </div>

              <div className="mtc-field">
                <label>Condition *</label>
                <input
                  name="condition"
                  value={form.condition}
                  onChange={handleChange}
                  placeholder="HF-Spheroidized Annealed"
                />
              </div>
            </div>
          </section>

          <section className="mtc-form-card">
            <div className="mtc-card-title">
              <div>
                <FlaskConical size={20} />
              </div>
              <span>
                <h3>Chemical Composition</h3>
                <p>Min/max auto-loaded. Fill only result.</p>
              </span>
            </div>

            <div className="mtc-chem-spec-grid">
              {chemicalElements.map((element) => {
                const spec = selectedSpec[element];
                const locked = spec.min === null && spec.max === null;

                return (
                  <div className="mtc-chem-spec-card" key={element}>
                    <div className="mtc-chem-symbol">{element}</div>

                    <div className="mtc-chem-range">
                      <span>Min: {locked ? "X" : spec.min ?? ""}</span>
                      <span>Max: {locked ? "X" : spec.max ?? ""}</span>
                    </div>

                    <input
                      value={form.chemicalComposition[element] || ""}
                      disabled={locked}
                      onChange={(e) =>
                        handleChemicalChange(element, e.target.value)
                      }
                      placeholder={locked ? "X" : "Result"}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mtc-note">
              Hardness, Hardenability, and Seat values are auto-filled from the
              selected grade in backend.
            </div>
          </section>

          <div className="mtc-form-actions">
            <button type="button" className="mtc-cancel-btn" onClick={onBack}>
              Cancel
            </button>

            <button type="submit" className="mtc-save-btn" disabled={saving}>
              {saving ? (
                <Loader2 className="mtc-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {saving ? "Generating..." : "Generate MTC PDF"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default GloriaMtcForm;
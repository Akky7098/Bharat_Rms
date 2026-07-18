import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import "./MtcForm.css";

import {
  getMtcProviders,
} from "../services/mtcService";

import {
  MTC_FORM_REGISTRY,
} from "./mtcForms";

/* =========================================================
   DEVELOPMENT FALLBACK PROVIDERS
========================================================= */

const DEFAULT_PROVIDERS = [
  {
    value: "gloria",
    label: "Gloria",
    description:
      "Generate Gloria Material Test Certificate",
  },
  {
    value: "bharat",
    label: "Bharat Special Steel",
    description:
      "Generate Bharat Special Steel Test Certificate",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeProvider = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatProviderLabel = (value) => {
  return String(value || "")
    .trim()
    .split(/[_-]/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

const normalizeProviderResponse = (
  response
) => {
  const data = Array.isArray(response?.data)
    ? response.data
    : [];

  return data
    .map((provider) => {
      if (typeof provider === "string") {
        return {
          value:
            normalizeProvider(provider),
          label:
            formatProviderLabel(provider),
          description: `Generate ${formatProviderLabel(
            provider
          )} test certificate`,
        };
      }

      const value = normalizeProvider(
        provider?.value ||
          provider?.provider ||
          provider?.key
      );

      if (!value) {
        return null;
      }

      return {
        value,
        label:
          provider?.label ||
          provider?.name ||
          formatProviderLabel(value),

        description:
          provider?.description ||
          `Generate ${
            provider?.label ||
            provider?.name ||
            formatProviderLabel(value)
          } test certificate`,
      };
    })
    .filter(Boolean);
};

/* =========================================================
   MAIN MTC FORM WRAPPER
========================================================= */

function MtcForm({
  onBack,
  onCreated,
}) {
  const [
    selectedProvider,
    setSelectedProvider,
  ] = useState("");

  const [
    providers,
    setProviders,
  ] = useState(DEFAULT_PROVIDERS);

  const [
    loadingProviders,
    setLoadingProviders,
  ] = useState(true);

  const [
    providerError,
    setProviderError,
  ] = useState("");

  /* =======================================================
     LOAD AVAILABLE PROVIDERS
  ======================================================= */

  const loadProviders =
    useCallback(async () => {
      try {
        setLoadingProviders(true);
        setProviderError("");

        const response =
          await getMtcProviders();

        const normalizedProviders =
          normalizeProviderResponse(
            response
          );

        if (
          normalizedProviders.length > 0
        ) {
          setProviders(
            normalizedProviders
          );
        } else {
          setProviders(
            DEFAULT_PROVIDERS
          );
        }
      } catch (error) {
        console.log(
          "GET MTC PROVIDERS ERROR =>",
          error
        );

        /*
         * Development fallback keeps the page
         * usable even when provider API fails.
         */
        setProviders(
          DEFAULT_PROVIDERS
        );

        setProviderError(
          "Unable to load providers from server. Showing configured providers."
        );
      } finally {
        setLoadingProviders(false);
      }
    }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  /* =======================================================
     AVAILABLE PROVIDERS WITH FRONTEND FORMS
  ======================================================= */

  const availableProviders =
    useMemo(() => {
      return providers.map(
        (provider) => ({
          ...provider,

          hasForm: Boolean(
            MTC_FORM_REGISTRY[
              normalizeProvider(
                provider.value
              )
            ]
          ),
        })
      );
    }, [providers]);

  /* =======================================================
     SELECTED FORM COMPONENT
  ======================================================= */

  const SelectedProviderForm =
    useMemo(() => {
      if (!selectedProvider) {
        return null;
      }

      return (
        MTC_FORM_REGISTRY[
          normalizeProvider(
            selectedProvider
          )
        ] || null
      );
    }, [selectedProvider]);

  const handleProviderSelect = (
    provider
  ) => {
    const providerValue =
      normalizeProvider(
        provider?.value
      );

    if (
      !providerValue ||
      !MTC_FORM_REGISTRY[
        providerValue
      ]
    ) {
      setProviderError(
        `${
          provider?.label ||
          formatProviderLabel(
            providerValue
          )
        } form has not been configured yet.`
      );

      return;
    }

    setProviderError("");
    setSelectedProvider(
      providerValue
    );
  };

  const handleBackFromProviderForm =
    () => {
      setSelectedProvider("");
      setProviderError("");
    };

  /* =======================================================
     RENDER PROVIDER FORM
  ======================================================= */

  if (
    selectedProvider &&
    SelectedProviderForm
  ) {
    return (
      <SelectedProviderForm
        onBack={
          handleBackFromProviderForm
        }
        onCancel={onBack}
        onCreated={onCreated}
        mtcProvider={
          selectedProvider
        }
      />
    );
  }

  /* =======================================================
     PROVIDER SELECTION SCREEN
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
          Back
        </button>

        <div>
          <span>
            Create Certificate
          </span>

          <h2>
            Select TC Provider
          </h2>
        </div>
      </div>

      {providerError && (
        <div className="mtc-form-error">
          {providerError}
        </div>
      )}

      <section className="mtc-form-card">
        <div className="mtc-card-title">
          <div>
            <Building2 size={20} />
          </div>

          <span>
            <h3>
              Test Certificate Provider
            </h3>

            <p>
              Select the provider whose
              certificate you want to
              generate.
            </p>
          </span>
        </div>

        {loadingProviders ? (
          <div className="mtc-provider-loading">
            <Loader2
              className="mtc-spin"
              size={20}
            />

            <span>
              Loading TC providers...
            </span>
          </div>
        ) : (
          <div className="mtc-provider-selection-grid">
            {availableProviders.map(
              (provider) => (
                <button
                  type="button"
                  key={provider.value}
                  className={`mtc-provider-selection-card ${
                    !provider.hasForm
                      ? "disabled"
                      : ""
                  }`}
                  onClick={() =>
                    handleProviderSelect(
                      provider
                    )
                  }
                  disabled={
                    !provider.hasForm
                  }
                >
                  <div className="mtc-provider-selection-icon">
                    <Building2
                      size={21}
                    />
                  </div>

                  <div className="mtc-provider-selection-content">
                    <strong>
                      {provider.label}
                    </strong>

                    <span>
                      {provider.description}
                    </span>

                    {!provider.hasForm && (
                      <small>
                        Form configuration
                        pending
                      </small>
                    )}
                  </div>

                  <ChevronRight
                    size={19}
                    className="mtc-provider-selection-arrow"
                  />
                </button>
              )
            )}
          </div>
        )}

        {!loadingProviders && (
          <button
            type="button"
            className="mtc-provider-refresh-btn"
            onClick={loadProviders}
          >
            <RefreshCcw size={15} />
            Refresh Providers
          </button>
        )}
      </section>
    </div>
  );
}

export default MtcForm;
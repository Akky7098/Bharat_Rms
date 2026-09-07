import GloriaMtcForm from "./GloriaMtcForm";
import BharatMtcForm from "./BharatMtcForm";
import SbeGermanyMtcForm from "./SbeGermanyMtcForm";

/*
 * Every MTC provider form is registered here.
 *
 * IMPORTANT:
 *
 * Key must exactly match the backend
 * mtcProvider value.
 */
export const MTC_FORM_REGISTRY = {
  gloria:
    GloriaMtcForm,

  bharat:
    BharatMtcForm,

  sbe_germany:
    SbeGermanyMtcForm,
};
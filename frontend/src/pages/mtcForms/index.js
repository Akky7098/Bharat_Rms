import GloriaMtcForm from "./GloriaMtcForm";
import BharatMtcForm from "./BharatMtcForm";

/*
 * Add every new provider form here.
 *
 * The key must match mtcProvider sent
 * by the backend.
 */
export const MTC_FORM_REGISTRY = {
  gloria: GloriaMtcForm,
  bharat: BharatMtcForm,
};
// A narrow grammatical variation, not fuzzy customer-name substitution.
// Stored names may use SOLUTION LLP where a person types "solutions".
function companyNamePattern(value){
 return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  .replace(/\b(?:rectech|rechtech)\b/gi,'rech?tech')
  .replace(/\bsolutions?\b/gi,'solutions?');
}
module.exports={companyNamePattern};

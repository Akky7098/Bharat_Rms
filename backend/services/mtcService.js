// const fs = require("fs");
// const path = require("path");
// const mongoose = require("mongoose");

// const {
//   MtcCertificate,
// } = require("../model/MtcCertificate");

// const BharatMtcCertificate = require(
//   "../model/BharatMtcCertificate"
// );

// const GloriaMtcCertificate = require(
//   "../model/GloriaMtcCertificate"
// );

// const mtcChemicalSpecs = require(
//   "../util/mtcChemicalSpecs"
// );

// const gloriaTemplate = require(
//   "../templates/mtc/gloriaTemplate"
// );

// const bharatTemplate = require(
//   "../templates/mtc/bharatTemplate"
// );

// /* =========================================================
//    CONSTANTS
// ========================================================= */

// const DEFAULT_PROVIDER = "gloria";

// const MAX_MTC_LIST_LIMIT = 200;

// const PUBLIC_MTC_UPLOAD_PATH =
//   "/uploads/mtc";

// /* =========================================================
//    BASIC HELPERS
// ========================================================= */

// const normalizeProvider = (value) => {
//   return String(
//     value || DEFAULT_PROVIDER
//   )
//     .trim()
//     .toLowerCase();
// };

// const cleanText = (
//   value,
//   fallback = ""
// ) => {
//   if (
//     value === null ||
//     value === undefined
//   ) {
//     return fallback;
//   }

//   return String(value).trim();
// };

// const firstValue = (...values) => {
//   for (const value of values) {
//     if (
//       value !== null &&
//       value !== undefined &&
//       String(value).trim() !== ""
//     ) {
//       return value;
//     }
//   }

//   return "";
// };

// const sanitizeFileName = (
//   value = ""
// ) => {
//   return String(value)
//     .replace(
//       /[<>:"/\\|?*\x00-\x1F]/g,
//       ""
//     )
//     .replace(/\s+/g, "_")
//     .replace(/_+/g, "_")
//     .replace(/^\.+|\.+$/g, "")
//     .trim();
// };

// const formatFileDate = (date) => {
//   const parsedDate = new Date(
//     date || new Date()
//   );

//   if (
//     Number.isNaN(
//       parsedDate.getTime()
//     )
//   ) {
//     return formatFileDate(
//       new Date()
//     );
//   }

//   return `${String(
//     parsedDate.getDate()
//   ).padStart(2, "0")}-${String(
//     parsedDate.getMonth() + 1
//   ).padStart(
//     2,
//     "0"
//   )}-${parsedDate.getFullYear()}`;
// };

// const getMtcPdfDirectory = () => {
//   return (
//     process.env
//       .MTC_PDF_STORAGE_PATH ||
//     path.join(
//       __dirname,
//       "..",
//       "uploads",
//       "mtc"
//     )
//   );
// };

// const ensurePdfDirectory = () => {
//   const pdfDirectory =
//     getMtcPdfDirectory();

//   if (
//     !fs.existsSync(
//       pdfDirectory
//     )
//   ) {
//     fs.mkdirSync(
//       pdfDirectory,
//       {
//         recursive: true,
//       }
//     );
//   }

//   return pdfDirectory;
// };

// const generateUniqueId = () => {
//   return `${Date.now()}_${Math.random()
//     .toString(36)
//     .slice(2, 10)}`;
// };

// const isValidObjectId = (
//   value
// ) => {
//   return mongoose.Types.ObjectId.isValid(
//     value
//   );
// };

// /* =========================================================
//    CHEMICAL HELPERS
// ========================================================= */

// const normalizeElementName = (
//   value
// ) => {
//   return String(value || "")
//     .replace(/\s+/g, "")
//     .trim()
//     .toLowerCase();
// };

// const findChemicalInput = (
//   inputComposition,
//   element
// ) => {
//   if (
//     !Array.isArray(
//       inputComposition
//     )
//   ) {
//     return null;
//   }

//   const normalizedElement =
//     normalizeElementName(
//       element
//     );

//   return (
//     inputComposition.find(
//       (item) =>
//         normalizeElementName(
//           item?.element
//         ) === normalizedElement
//     ) || null
//   );
// };

// /* =========================================================
//    GLORIA CHEMICAL VALIDATION
// ========================================================= */

// const validateGloriaChemicalComposition =
//   (
//     grade,
//     inputComposition = []
//   ) => {
//     const gradeConfig =
//       mtcChemicalSpecs[grade];

//     if (!gradeConfig) {
//       throw new Error(
//         `Chemical composition spec not configured for grade ${grade}`
//       );
//     }

//     const gradeSpec =
//       gradeConfig.elements ||
//       gradeConfig;

//     return Object.keys(
//       gradeSpec
//     ).map((element) => {
//       const spec =
//         gradeSpec[element];

//       const input =
//         findChemicalInput(
//           inputComposition,
//           element
//         );

//       const hasNoMinAndMax =
//         spec.min === null &&
//         spec.max === null;

//       if (hasNoMinAndMax) {
//         return {
//           element,
//           min: null,
//           max: null,
//           result: "X",
//         };
//       }

//       if (
//         !input ||
//         input.result === "" ||
//         input.result === null ||
//         input.result ===
//           undefined
//       ) {
//         throw new Error(
//           `${element} result is required`
//         );
//       }

//       const result = Number(
//         input.result
//       );

//       if (
//         Number.isNaN(result)
//       ) {
//         throw new Error(
//           `${element} result must be numeric`
//         );
//       }

//       if (
//         spec.min !== null &&
//         spec.min !== undefined &&
//         result <
//           Number(spec.min)
//       ) {
//         throw new Error(
//           `${element} result must be greater than or equal to ${spec.min}`
//         );
//       }

//       if (
//         spec.max !== null &&
//         spec.max !== undefined &&
//         result >
//           Number(spec.max)
//       ) {
//         throw new Error(
//           `${element} result must be less than or equal to ${spec.max}`
//         );
//       }

//       return {
//         element,

//         min:
//           spec.min === null ||
//           spec.min ===
//             undefined
//             ? null
//             : Number(
//                 spec.min
//               ),

//         max:
//           spec.max === null ||
//           spec.max ===
//             undefined
//             ? null
//             : Number(
//                 spec.max
//               ),

//         result,
//       };
//     });
//   };

// /* =========================================================
//    BHARAT CHEMICAL NORMALIZATION
// ========================================================= */

// const normalizeBharatChemicalComposition =
//   (
//     inputComposition = []
//   ) => {
//     const bharatElements = [
//       "C",
//       "Si",
//       "Mn",
//       "P",
//       "S",
//       "Cr",
//       "Mo",
//       "Ni",
//       "Al",
//       "Cu",
//       "Ti",
//       "V",
//       "Nb",
//       "B",
//     ];

//     return bharatElements.map(
//       (element) => {
//         const input =
//           findChemicalInput(
//             inputComposition,
//             element
//           );

//         const rawResult =
//           firstValue(
//             input?.result,
//             input?.achieved,
//             input?.value,
//             "-"
//           );

//         let result =
//           rawResult;

//         if (
//           rawResult !== "-" &&
//           rawResult !== "X" &&
//           rawResult !== "x" &&
//           rawResult !== ""
//         ) {
//           const numericValue =
//             Number(
//               rawResult
//             );

//           result =
//             Number.isNaN(
//               numericValue
//             )
//               ? cleanText(
//                   rawResult,
//                   "-"
//                 )
//               : numericValue;
//         }

//         return {
//           element,

//           min:
//             input?.min ===
//               "" ||
//             input?.min ===
//               undefined
//               ? null
//               : input.min,

//           max:
//             input?.max ===
//               "" ||
//             input?.max ===
//               undefined
//               ? null
//               : input.max,

//           result,
//         };
//       }
//     );
//   };

// /* =========================================================
//    GENERIC CHEMICAL NORMALIZER
// ========================================================= */

// const normalizeGenericChemicalComposition =
//   (
//     inputComposition = []
//   ) => {
//     if (
//       !Array.isArray(
//         inputComposition
//       )
//     ) {
//       return [];
//     }

//     return inputComposition
//       .filter((item) =>
//         cleanText(
//           item?.element
//         )
//       )
//       .map((item) => ({
//         element:
//           cleanText(
//             item.element
//           ),

//         min:
//           item.min === "" ||
//           item.min ===
//             undefined
//             ? null
//             : item.min,

//         max:
//           item.max === "" ||
//           item.max ===
//             undefined
//             ? null
//             : item.max,

//         result:
//           firstValue(
//             item.result,
//             "-"
//           ),
//       }));
//   };

// /* =========================================================
//    GLORIA PAYLOAD NORMALIZATION
// ========================================================= */

// const normalizeGloriaPayload = (
//   payload,
//   loggedInUser
// ) => {
//   const grade =
//     cleanText(
//       payload.grade
//     );

//   if (!grade) {
//     throw new Error(
//       "Grade is required"
//     );
//   }

//   const gradeConfig =
//     mtcChemicalSpecs[
//       grade
//     ];

//   if (!gradeConfig) {
//     throw new Error(
//       `MTC configuration not found for grade ${grade}`
//     );
//   }

//   const messers =
//     cleanText(
//       firstValue(
//         payload.messers,
//         payload.companyName
//       )
//     );

//   const chemicalComposition =
//     validateGloriaChemicalComposition(
//       grade,
//       payload.chemicalComposition ||
//         []
//     );

//   return {
//     ...payload,

//     mtcProvider:
//       "gloria",

//     messers,

//     companyName:
//       cleanText(
//         firstValue(
//           payload.companyName,
//           messers
//         )
//       ),

//     customerName:
//       cleanText(
//         firstValue(
//           payload.customerName,
//           payload.companyName,
//           messers
//         )
//       ),

//     customerAddress:
//       cleanText(
//         firstValue(
//           payload.customerAddress,
//           payload.companyAddress
//         )
//       ),

//     orderNo:
//       cleanText(
//         payload.orderNo
//       ),

//     poNo:
//       cleanText(
//         payload.poNo
//       ),

//     fileNo:
//       cleanText(
//         payload.fileNo
//       ),

//     invoiceNo:
//       cleanText(
//         payload.invoiceNo
//       ),

//     mtcDate:
//       payload.mtcDate ||
//       new Date(),

//     grade,

//     weight:
//       cleanText(
//         payload.weight
//       ),

//     size:
//       cleanText(
//         payload.size
//       ),

//     pcs:
//       cleanText(
//         payload.pcs
//       ),

//     heatLotNo:
//       cleanText(
//         payload.heatLotNo
//       ),

//     condition:
//       cleanText(
//         payload.condition
//       ),

//     chemicalComposition,

//     hardness:
//       gradeConfig
//         .hardness || {},

//     hardenability:
//       gradeConfig
//         .hardenability || {},

//     seat:
//       gradeConfig.seat ||
//       {},

//     createdBy:
//       loggedInUser?._id ||
//       payload.createdBy,

//     updatedBy:
//       payload.updatedBy ||
//       null,
//   };
// };

// /* =========================================================
//    BHARAT ITEMS
// ========================================================= */

// const normalizeBharatItems = (
//   payload
// ) => {
//   const inputItems =
//     payload.items ||
//     payload.itemDescription ||
//     payload.materialItems ||
//     [];

//   if (
//     Array.isArray(
//       inputItems
//     ) &&
//     inputItems.length > 0
//   ) {
//     return inputItems.map(
//       (item, index) => ({
//         heatNo:
//           cleanText(
//             firstValue(
//               item.heatNo,
//               item.heatNumber,
//               payload.heatLotNo
//             )
//           ),

//         size:
//           cleanText(
//             firstValue(
//               item.size,
//               item.materialSize,
//               payload.size
//             )
//           ),

//         noOfPcs:
//           cleanText(
//             firstValue(
//               item.noOfPcs,
//               item.pcs,
//               item.quantityPcs,
//               "-"
//             )
//           ),

//         quantityInKgs:
//           cleanText(
//             firstValue(
//               item.quantityInKgs,
//               item.quantity,
//               item.qty,
//               item.weight,
//               payload.weight
//             )
//           ),

//         remarks:
//           cleanText(
//             firstValue(
//               item.remarks,
//               "-"
//             )
//           ),

//         rowNumber:
//           index + 1,
//       })
//     );
//   }

//   return [
//     {
//       heatNo:
//         cleanText(
//           payload.heatLotNo
//         ),

//       size:
//         cleanText(
//           payload.size
//         ),

//       noOfPcs:
//         cleanText(
//           firstValue(
//             payload.pcs,
//             "-"
//           )
//         ),

//       quantityInKgs:
//         cleanText(
//           firstValue(
//             payload.weight,
//             payload.quantityInKgs
//           )
//         ),

//       remarks:
//         cleanText(
//           firstValue(
//             payload.remarks,
//             "-"
//           )
//         ),
//     },
//   ];
// };

// /* =========================================================
//    BHARAT HARDENABILITY
// ========================================================= */

// const normalizeBharatHardenability =
//   (payload) => {
//     const source =
//       payload.hardenabilityTest ||
//       payload.hardenability ||
//       {};

//     const distanceResults =
//       source.distanceResults ||
//       payload.hardenabilityRows ||
//       [];

//     return {
//       standard:
//         cleanText(
//           firstValue(
//             source.standard,
//             "IS: 3848, ASTM A255, SAE J406"
//           )
//         ),

//       distanceResults:
//         Array.isArray(
//           distanceResults
//         )
//           ? distanceResults.map(
//               (item) => ({
//                 distance:
//                   cleanText(
//                     firstValue(
//                       item.distance,
//                       item.distanceMm,
//                       item.position
//                     )
//                   ),

//                 specMin:
//                   cleanText(
//                     item.specMin
//                   ),

//                 specMax:
//                   cleanText(
//                     item.specMax
//                   ),

//                 result:
//                   cleanText(
//                     item.result
//                   ),
//               })
//             )
//           : [],
//     };
//   };

// /* =========================================================
//    BHARAT PAYLOAD NORMALIZATION
// ========================================================= */

// const normalizeBharatPayload = (
//   payload,
//   loggedInUser
// ) => {
//   const customerName =
//     cleanText(
//       firstValue(
//         payload.customerName,
//         payload.companyName,
//         payload.messers
//       )
//     );

//   const companyName =
//     cleanText(
//       firstValue(
//         payload.companyName,
//         customerName
//       )
//     );

//   const items =
//     normalizeBharatItems(
//       payload
//     );

//   const primaryItem =
//     items[0] || {};

//   return {
//     ...payload,

//     mtcProvider:
//       "bharat",

//     messers:
//       cleanText(
//         firstValue(
//           payload.messers,
//           customerName,
//           companyName
//         )
//       ),

//     companyName,

//     customerName,

//     customerAddress:
//       cleanText(
//         firstValue(
//           payload.customerAddress,
//           payload.companyAddress,
//           payload.address
//         )
//       ),

//     orderNo:
//       cleanText(
//         firstValue(
//           payload.orderNo,
//           payload.salesOrderNo
//         )
//       ),

//     poNo:
//       cleanText(
//         firstValue(
//           payload.poNo,
//           payload.poNumber,
//           "-"
//         )
//       ),

//     invoiceNo:
//       cleanText(
//         firstValue(
//           payload.invoiceNo,
//           payload.invoiceNumber
//         )
//       ),

//     tcNo:
//       cleanText(
//         firstValue(
//           payload.tcNo,
//           payload.certificateNo,
//           payload.mtcNumber
//         )
//       ),

//     issueDate:
//       payload.issueDate ||
//       payload.mtcDate ||
//       new Date(),

//     mtcDate:
//       payload.mtcDate ||
//       payload.issueDate ||
//       new Date(),

//     tdcNo:
//       cleanText(
//         firstValue(
//           payload.tdcNo,
//           payload.tdcNumber,
//           "N/A"
//         )
//       ),

//     grade:
//       cleanText(
//         firstValue(
//           payload.grade,
//           payload.purchaseSpecification
//         )
//       ),

//     purchaseSpecification:
//       cleanText(
//         firstValue(
//           payload.purchaseSpecification,
//           payload.grade
//         )
//       ),

//     product:
//       cleanText(
//         firstValue(
//           payload.product,
//           payload.productDescription,
//           payload.materialDescription
//         )
//       ),

//     manufacturingRoute:
//       cleanText(
//         firstValue(
//           payload.manufacturingRoute,
//           payload.mfgRoute,
//           payload.condition
//         )
//       ),

//     heatLotNo:
//       cleanText(
//         firstValue(
//           payload.heatLotNo,
//           primaryItem.heatNo
//         )
//       ),

//     size:
//       cleanText(
//         firstValue(
//           payload.size,
//           primaryItem.size
//         )
//       ),

//     weight:
//       cleanText(
//         firstValue(
//           payload.weight,
//           primaryItem.quantityInKgs
//         )
//       ),

//     pcs:
//       cleanText(
//         firstValue(
//           payload.pcs,
//           primaryItem.noOfPcs,
//           "-"
//         )
//       ),

//     condition:
//       cleanText(
//         firstValue(
//           payload.condition,
//           payload.manufacturingRoute
//         )
//       ),

//     items,

//     chemicalComposition:
//       normalizeBharatChemicalComposition(
//         payload.chemicalComposition ||
//           []
//       ),

//     mechanicalProperties: {
//       hardnessBhn:
//         cleanText(
//           firstValue(
//             payload
//               .mechanicalProperties
//               ?.hardnessBhn,
//             payload.hardness?.bhn,
//             payload.hardnessBhn
//           )
//         ),

//       hardnessSpec:
//         cleanText(
//           firstValue(
//             payload
//               .mechanicalProperties
//               ?.hardnessSpec,
//             payload.hardness?.spec,
//             payload.hardnessSpec
//           )
//         ),

//       hardnessResult:
//         cleanText(
//           firstValue(
//             payload
//               .mechanicalProperties
//               ?.hardnessResult,
//             payload.hardness
//               ?.result,
//             payload.hardnessResult
//           )
//         ),

//       sampleRemark:
//         cleanText(
//           firstValue(
//             payload
//               .mechanicalProperties
//               ?.sampleRemark,
//             payload
//               .mechanicalSampleRemark,
//             "ONLY H&T SAMPLE"
//           )
//         ),

//       tensileStrength:
//         payload
//           .mechanicalProperties
//           ?.tensileStrength ||
//         {},

//       yieldStrength:
//         payload
//           .mechanicalProperties
//           ?.yieldStrength ||
//         {},

//       elongation:
//         payload
//           .mechanicalProperties
//           ?.elongation ||
//         {},

//       impactStrength:
//         payload
//           .mechanicalProperties
//           ?.impactStrength ||
//         {},
//     },

//     rawMaterialDetail: {
//       source:
//         cleanText(
//           payload
//             .rawMaterialDetail
//             ?.source
//         ),

//       reference:
//         cleanText(
//           payload
//             .rawMaterialDetail
//             ?.reference
//         ),
//     },

//     hardenabilityTest:
//       normalizeBharatHardenability(
//         payload
//       ),

//     ultrasonicTesting: {
//       referenceStandard:
//         cleanText(
//           firstValue(
//             payload
//               .ultrasonicTesting
//               ?.referenceStandard,
//             "ASTM A388"
//           )
//         ),

//       acceptance:
//         cleanText(
//           firstValue(
//             payload
//               .ultrasonicTesting
//               ?.acceptance,
//             "4MM FBH, 2MHZ"
//           )
//         ),

//       probeUsed:
//         cleanText(
//           firstValue(
//             payload
//               .ultrasonicTesting
//               ?.probeUsed,
//             "24MM"
//           )
//         ),

//       result:
//         cleanText(
//           firstValue(
//             payload
//               .ultrasonicTesting
//               ?.result,
//             "100% SATISFACTORY"
//           )
//         ),
//     },

//     gasAnalysis: {
//       o2:
//         payload.gasAnalysis
//           ?.o2 || {},

//       n2:
//         payload.gasAnalysis
//           ?.n2 || {},

//       h2:
//         payload.gasAnalysis
//           ?.h2 || {},
//     },

//     depthOfDecarbonization: {
//       mixupTesting:
//         cleanText(
//           firstValue(
//             payload
//               .depthOfDecarbonization
//               ?.mixupTesting,
//             payload.mixupTesting,
//             "OK"
//           )
//         ),

//       microstructure:
//         cleanText(
//           firstValue(
//             payload
//               .depthOfDecarbonization
//               ?.microstructure,
//             payload.microstructure,
//             "Pearlite + Ferrite"
//           )
//         ),
//     },

//     inclusionRating:
//       payload.inclusionRating ||
//       {},

//     grainSize: {
//       specified:
//         cleanText(
//           firstValue(
//             payload.grainSize
//               ?.specified,
//             "5-8"
//           )
//         ),

//       achieved:
//         cleanText(
//           firstValue(
//             payload.grainSize
//               ?.achieved,
//             typeof payload.grainSize ===
//               "string"
//               ? payload.grainSize
//               : ""
//           )
//         ),
//     },

//     macrostructure:
//       cleanText(
//         firstValue(
//           payload.macrostructure,
//           payload.macroStructure
//         )
//       ),

//     physicalTesting: {
//       sdt:
//         cleanText(
//           firstValue(
//             payload
//               .physicalTesting
//               ?.sdt,
//             "N/A"
//           )
//         ),

//       coldBendTest:
//         cleanText(
//           firstValue(
//             payload
//               .physicalTesting
//               ?.coldBendTest,
//             "N/A"
//           )
//         ),

//       surface:
//         cleanText(
//           payload
//             .physicalTesting
//             ?.surface
//         ),
//     },

//     identificationDetail:
//       cleanText(
//         firstValue(
//           payload.identificationDetail,
//           "Heat No, Grade, Size has been marked on Bar. Free from bend"
//         )
//       ),

//     colourCode:
//       cleanText(
//         firstValue(
//           payload.colourCode,
//           payload.colorCode,
//           "N/A"
//         )
//       ),

//     dimensionalInspection:
//       cleanText(
//         firstValue(
//           payload
//             .dimensionalInspection,
//           "Dimensional inspection carried out as per above mentioned PO/TDS and found within limits"
//         )
//       ),

//     visualInspection:
//       cleanText(
//         firstValue(
//           payload.visualInspection,
//           "Visual inspection carried out as per T.D.C and found satisfactory"
//         )
//       ),

//     resultDeclaration:
//       cleanText(
//         firstValue(
//           payload.resultDeclaration,
//           payload.result,
//           "We hereby certify that material is free from radioactive elements, has been manufactured and inspected, and found acceptable as per customer requirement"
//         )
//       ),

//     preparedBy:
//       cleanText(
//         firstValue(
//           payload.preparedBy,
//           loggedInUser?.name
//         )
//       ),

//     createdBy:
//       loggedInUser?._id ||
//       payload.createdBy,

//     updatedBy:
//       payload.updatedBy ||
//       null,
//   };
// };

// /* =========================================================
//    PROVIDER REGISTRY
// ========================================================= */

// const MTC_PROVIDER_REGISTRY = {
//   gloria: {
//     provider:
//       "gloria",

//     model:
//       GloriaMtcCertificate,

//     template:
//       gloriaTemplate,

//     normalizePayload:
//       normalizeGloriaPayload,

//     filePrefix:
//       "MTC",

//     getCompanyName:
//       (mtc) =>
//         firstValue(
//           mtc.messers,
//           mtc.companyName,
//           mtc.customerName,
//           "Customer"
//         ),

//     getDocumentNumber:
//       (mtc) =>
//         firstValue(
//           mtc.orderNo,
//           mtc.fileNo,
//           mtc._id
//         ),

//     getDocumentDate:
//       (mtc) =>
//         firstValue(
//           mtc.mtcDate,
//           mtc.createdAt,
//           new Date()
//         ),
//   },

//   bharat: {
//     provider:
//       "bharat",

//     model:
//       BharatMtcCertificate,

//     template:
//       bharatTemplate,

//     normalizePayload:
//       normalizeBharatPayload,

//     filePrefix:
//       "TC_BHARAT",

//     getCompanyName:
//       (mtc) =>
//         firstValue(
//           mtc.customerName,
//           mtc.companyName,
//           mtc.messers,
//           "Customer"
//         ),

//     getDocumentNumber:
//       (mtc) =>
//         firstValue(
//           mtc.tcNo,
//           mtc.invoiceNo,
//           mtc.orderNo,
//           mtc._id
//         ),

//     getDocumentDate:
//       (mtc) =>
//         firstValue(
//           mtc.issueDate,
//           mtc.mtcDate,
//           mtc.createdAt,
//           new Date()
//         ),
//   },
// };

// /* =========================================================
//    GET PROVIDER CONFIG
// ========================================================= */

// const getProviderConfiguration = (
//   provider
// ) => {
//   const normalizedProvider =
//     normalizeProvider(
//       provider
//     );

//   const configuration =
//     MTC_PROVIDER_REGISTRY[
//       normalizedProvider
//     ];

//   if (!configuration) {
//     throw new Error(
//       `MTC provider not configured: ${normalizedProvider}`
//     );
//   }

//   return configuration;
// };

// const getConfiguredProviders =
//   () => {
//     return Object.keys(
//       MTC_PROVIDER_REGISTRY
//     );
//   };

// /* =========================================================
//    TEMPLATE SELECTION
// ========================================================= */

// const getTemplateByProvider = (
//   provider
// ) => {
//   return getProviderConfiguration(
//     provider
//   ).template;
// };

// /* =========================================================
//    MTC HTML -> PDF

//    GLORIA + BHARAT ONLY

//    IMPORTANT:
//    - No ensureChromium
//    - No chromiumLock
//    - No BrowserFetcher
//    - No custom executablePath
//    - No Chromium download
//    - Puppeteer loads only when MTC PDF is requested
// ========================================================= */

// const generateMtcPdfBuffer =
//   async (mtc) => {
//     const plainMtc =
//       typeof mtc?.toObject ===
//       "function"
//         ? mtc.toObject({
//             virtuals:
//               true,
//           })
//         : mtc;

//     const provider =
//       normalizeProvider(
//         plainMtc?.mtcProvider
//       );

//     if (
//       provider !==
//         "gloria" &&
//       provider !==
//         "bharat"
//     ) {
//       throw new Error(
//         `Unsupported provider in mtcService: ${provider}`
//       );
//     }

//     const template =
//       getTemplateByProvider(
//         provider
//       );

//     if (
//       typeof template !==
//       "function"
//     ) {
//       throw new Error(
//         `Invalid MTC template for provider: ${provider}`
//       );
//     }

//     const html =
//       template(
//         plainMtc
//       );

//     if (
//       !html ||
//       typeof html !==
//         "string"
//     ) {
//       throw new Error(
//         `MTC template returned invalid HTML for provider: ${provider}`
//       );
//     }

//     /*
//      * Important:
//      *
//      * Puppeteer is NOT imported at
//      * application startup.
//      *
//      * It is required only when a
//      * Gloria/Bharat MTC PDF is created.
//      */
//     const puppeteer =
//       require("puppeteer");

//     let browser =
//       null;

//     let page =
//       null;

//     try {
//       /*
//        * IMPORTANT:
//        *
//        * No ensureChromium().
//        * No custom executablePath.
//        * No browser download.
//        */
//       browser =
//         await puppeteer.launch({
//           headless:
//             true,

//           args: [
//             "--no-sandbox",
//             "--disable-setuid-sandbox",
//             "--disable-dev-shm-usage",
//             "--disable-gpu",
//             "--disable-extensions",
//             "--no-first-run",
//           ],
//         });

//       if (
//         !browser ||
//         !browser.isConnected()
//       ) {
//         throw new Error(
//           "MTC PDF browser failed to start."
//         );
//       }

//       page =
//         await browser.newPage();

//       await page.setContent(
//         html,
//         {
//           waitUntil:
//             "domcontentloaded",

//           timeout:
//             120000,
//         }
//       );

//       await page.emulateMediaType(
//         "screen"
//       );

//       /* =====================================================
//          WAIT FOR FONTS
//       ===================================================== */

//       try {
//         await page.evaluate(
//           async () => {
//             if (
//               document.fonts &&
//               document.fonts.ready
//             ) {
//               await document
//                 .fonts.ready;
//             }
//           }
//         );
//       } catch (error) {
//         console.log(
//           "MTC PDF FONT WAIT WARNING =>",
//           error.message
//         );
//       }

//       /* =====================================================
//          WAIT FOR IMAGES
//       ===================================================== */

//       try {
//         await page.evaluate(
//           async () => {
//             const images =
//               Array.from(
//                 document.images ||
//                   []
//               );

//             await Promise.all(
//               images.map(
//                 (image) => {
//                   if (
//                     image.complete
//                   ) {
//                     return Promise.resolve();
//                   }

//                   return new Promise(
//                     (resolve) => {
//                       image.onload =
//                         resolve;

//                       image.onerror =
//                         resolve;
//                     }
//                   );
//                 }
//               )
//             );
//           }
//         );
//       } catch (error) {
//         console.log(
//           "MTC PDF IMAGE WAIT WARNING =>",
//           error.message
//         );
//       }

//       await new Promise(
//         (resolve) =>
//           setTimeout(
//             resolve,
//             400
//           )
//       );

//       /* =====================================================
//          GENERATE PDF
//       ===================================================== */

//       const pdfBuffer =
//         await page.pdf({
//           format:
//             "A4",

//           printBackground:
//             true,

//           preferCSSPageSize:
//             true,

//           margin: {
//             top:
//               "0mm",

//             right:
//               "0mm",

//             bottom:
//               "0mm",

//             left:
//               "0mm",
//           },
//         });

//       if (
//         !pdfBuffer ||
//         pdfBuffer.length ===
//           0
//       ) {
//         throw new Error(
//           "MTC PDF generation returned an empty file."
//         );
//       }

//       return pdfBuffer;
//     } catch (error) {
//       console.error(
//         "MTC PDF GENERATION ERROR =>",
//         error
//       );

//       throw error;
//     } finally {
//       if (page) {
//         await page
//           .close()
//           .catch(
//             () => {}
//           );
//       }

//       if (browser) {
//         await browser
//           .close()
//           .catch(
//             () => {}
//           );
//       }
//     }
//   };

// /* =========================================================
//    GENERATE MTC PDF FILE
// ========================================================= */

// const generateMtcPdf =
//   async (
//     mtc
//   ) => {
//     const providerConfiguration =
//       getProviderConfiguration(
//         mtc.mtcProvider
//       );

//     const pdfDirectory =
//       ensurePdfDirectory();

//     const company =
//       sanitizeFileName(
//         providerConfiguration
//           .getCompanyName(
//             mtc
//           )
//       ) ||
//       "Customer";

//     const documentNumber =
//       sanitizeFileName(
//         providerConfiguration
//           .getDocumentNumber(
//             mtc
//           )
//       ) ||
//       sanitizeFileName(
//         mtc._id
//       ) ||
//       "Document";

//     const grade =
//       sanitizeFileName(
//         firstValue(
//           mtc.grade,
//           "Grade"
//         )
//       ) ||
//       "Grade";

//     const date =
//       formatFileDate(
//         providerConfiguration
//           .getDocumentDate(
//             mtc
//           )
//       );

//     const uniqueId =
//       generateUniqueId();

//     const filePrefix =
//       sanitizeFileName(
//         providerConfiguration
//           .filePrefix ||
//           "MTC"
//       );

//     const fileName = [
//       filePrefix,
//       company,
//       documentNumber,
//       grade,
//       date,
//       uniqueId,
//     ]
//       .filter(Boolean)
//       .join("_")
//       .concat(".pdf");

//     const filePath =
//       path.join(
//         pdfDirectory,
//         fileName
//       );

//     console.log(
//       "NEW MTC PDF CREATED =>",
//       fileName
//     );

//     const pdfBuffer =
//       await generateMtcPdfBuffer(
//         mtc
//       );

//     fs.writeFileSync(
//       filePath,
//       pdfBuffer
//     );

//     return {
//       fileName,

//       filePath,

//       fileUrl:
//         `${PUBLIC_MTC_UPLOAD_PATH}/${fileName}`,

//       generatedAt:
//         new Date(),
//     };
//   };

// /* =========================================================
//    APPLY PDF DATA
// ========================================================= */

// const applyPdfData = (
//   mtc,
//   pdfData
// ) => {
//   mtc.pdf = {
//     fileName:
//       pdfData.fileName,

//     filePath:
//       pdfData.filePath,

//     fileUrl:
//       pdfData.fileUrl,

//     generatedAt:
//       pdfData.generatedAt ||
//       new Date(),
//   };

//   mtc.pdfUrl =
//     pdfData.fileUrl;

//   mtc.pdfFileName =
//     pdfData.fileName;

//   if (
//     typeof mtc.markModified ===
//     "function"
//   ) {
//     mtc.markModified(
//       "pdf"
//     );
//   }
// };

// /* =========================================================
//    DELETE PDF FILE
// ========================================================= */

// const deletePdfFile = (
//   filePath
// ) => {
//   if (
//     filePath &&
//     fs.existsSync(
//       filePath
//     )
//   ) {
//     try {
//       fs.unlinkSync(
//         filePath
//       );
//     } catch (error) {
//       console.error(
//         "DELETE PDF ERROR =>",
//         error
//       );
//     }
//   }
// };

// /* =========================================================
//    CREATE CERTIFICATE
// ========================================================= */

// const createMtcCertificate =
//   async (
//     payload,
//     loggedInUser
//   ) => {
//     let createdCertificate =
//       null;

//     let generatedPdfData =
//       null;

//     try {
//       const provider =
//         normalizeProvider(
//           payload?.mtcProvider
//         );

//       /*
//        * This service accepts ONLY
//        * Gloria and Bharat.
//        *
//        * SBE Germany is handled by
//        * sbeGermanyMtcService.js.
//        */
//       if (
//         provider !==
//           "gloria" &&
//         provider !==
//           "bharat"
//       ) {
//         throw new Error(
//           `MTC provider not handled by mtcService: ${provider}`
//         );
//       }

//       const providerConfiguration =
//         getProviderConfiguration(
//           provider
//         );

//       if (
//         !providerConfiguration
//           ?.model ||
//         typeof providerConfiguration
//           .model.create !==
//           "function"
//       ) {
//         throw new Error(
//           `Invalid MTC model configured for provider: ${provider}`
//         );
//       }

//       if (
//         typeof providerConfiguration
//           .normalizePayload !==
//         "function"
//       ) {
//         throw new Error(
//           `MTC payload normalizer is missing for provider: ${provider}`
//         );
//       }

//       const payloadForNormalization =
//         {
//           ...payload,

//           mtcProvider:
//             provider,
//         };

//       const normalizedPayload =
//         providerConfiguration
//           .normalizePayload(
//             payloadForNormalization,
//             loggedInUser
//           );

//       if (
//         !normalizedPayload ||
//         typeof normalizedPayload !==
//           "object"
//       ) {
//         throw new Error(
//           `Invalid normalized MTC payload for provider: ${provider}`
//         );
//       }

//       normalizedPayload.mtcProvider =
//         provider;

//       /* =====================================================
//          CREATE DATABASE RECORD
//       ===================================================== */

//       createdCertificate =
//         await providerConfiguration
//           .model.create(
//             normalizedPayload
//           );

//       /* =====================================================
//          GENERATE PDF
//       ===================================================== */

//       generatedPdfData =
//         await generateMtcPdf(
//           createdCertificate
//         );

//       if (
//         !generatedPdfData
//           ?.fileName ||
//         !generatedPdfData
//           ?.filePath ||
//         !generatedPdfData
//           ?.fileUrl
//       ) {
//         throw new Error(
//           "MTC PDF generation returned incomplete file details"
//         );
//       }

//       applyPdfData(
//         createdCertificate,
//         generatedPdfData
//       );

//       await createdCertificate.save();

//       return createdCertificate;
//     } catch (error) {
//       /*
//        * Remove newly generated PDF
//        * if something failed.
//        */
//       if (
//         generatedPdfData
//           ?.filePath
//       ) {
//         deletePdfFile(
//           generatedPdfData
//             .filePath
//         );
//       }

//       /*
//        * If database record was created
//        * but PDF generation failed,
//        * rollback that new record.
//        */
//       if (
//         createdCertificate
//           ?._id
//       ) {
//         try {
//           await createdCertificate
//             .constructor
//             .deleteOne({
//               _id:
//                 createdCertificate
//                   ._id,
//             });
//         } catch (
//           deleteError
//         ) {
//           console.error(
//             "FAILED TO ROLLBACK MTC RECORD =>",
//             deleteError
//           );
//         }
//       }

//       throw error;
//     }
//   };

// /* =========================================================
//    FIND CERTIFICATE

//    IMPORTANT:

//    No provider supplied:
//    Search by ID so controller can identify whether
//    record is Gloria, Bharat or SBE.

//    Provider supplied:
//    This service only accepts Gloria/Bharat.
// ========================================================= */

// const findMtcById =
//   async (
//     id,
//     preferredProvider = ""
//   ) => {
//     if (
//       !isValidObjectId(
//         id
//       )
//     ) {
//       throw new Error(
//         "Invalid MTC certificate ID"
//       );
//     }

//     const query = {
//       _id:
//         id,
//     };

//     if (
//       preferredProvider
//     ) {
//       const normalizedProvider =
//         normalizeProvider(
//           preferredProvider
//         );

//       /*
//        * Only validate against this
//        * service if provider was passed.
//        */
//       getProviderConfiguration(
//         normalizedProvider
//       );

//       query.mtcProvider =
//         normalizedProvider;
//     }

//     return MtcCertificate.findOne(
//       query
//     );
//   };

// /* =========================================================
//    GET SINGLE CERTIFICATE
// ========================================================= */

// const getMtcCertificateById =
//   async (
//     id,
//     provider = ""
//   ) => {
//     const mtc =
//       await findMtcById(
//         id,
//         provider
//       );

//     if (!mtc) {
//       throw new Error(
//         "MTC certificate not found"
//       );
//     }

//     return mtc;
//   };

// /* =========================================================
//    UPDATE CERTIFICATE + REGENERATE PDF

//    GLORIA + BHARAT ONLY
// ========================================================= */

// const updateMtcCertificate =
//   async (
//     id,
//     payload,
//     loggedInUser,
//     preferredProvider = ""
//   ) => {
//     const existingMtc =
//       await findMtcById(
//         id,
//         preferredProvider
//       );

//     if (!existingMtc) {
//       throw new Error(
//         "MTC certificate not found"
//       );
//     }

//     const provider =
//       normalizeProvider(
//         existingMtc.mtcProvider
//       );

//     if (
//       provider !==
//         "gloria" &&
//       provider !==
//         "bharat"
//     ) {
//       throw new Error(
//         `MTC provider not handled by mtcService: ${provider}`
//       );
//     }

//     /* =====================================================
//        PROVIDER CANNOT CHANGE
//     ===================================================== */

//     if (
//       payload.mtcProvider &&
//       normalizeProvider(
//         payload.mtcProvider
//       ) !==
//         provider
//     ) {
//       throw new Error(
//         "MTC provider cannot be changed after certificate creation"
//       );
//     }

//     const providerConfiguration =
//       getProviderConfiguration(
//         provider
//       );

//     const existingPlain =
//       existingMtc.toObject({
//         virtuals:
//           false,
//       });

//     /*
//      * Existing Gloria/Bharat behaviour.
//      */
//     const mergedPayload = {
//       ...existingPlain,
//       ...payload,

//       mtcProvider:
//         provider,

//       pdf:
//         existingPlain.pdf,

//       chemicalComposition:
//         payload
//           .chemicalComposition ??
//         existingPlain
//           .chemicalComposition,
//     };

//     const normalizedPayload =
//       providerConfiguration
//         .normalizePayload(
//           mergedPayload,
//           loggedInUser
//         );

//     /*
//      * Creator never changes.
//      */
//     normalizedPayload.createdBy =
//       existingMtc.createdBy;

//     normalizedPayload.updatedBy =
//       loggedInUser?._id ||
//       payload.updatedBy ||
//       existingMtc.updatedBy ||
//       null;

//     normalizedPayload.mtcProvider =
//       provider;

//     /*
//      * Existing PDF stays untouched until
//      * new PDF has been created successfully.
//      */
//     delete normalizedPayload.pdf;

//     delete normalizedPayload.pdfUrl;

//     delete normalizedPayload
//       .pdfFileName;

//     delete normalizedPayload._id;

//     delete normalizedPayload
//       .createdAt;

//     delete normalizedPayload
//       .updatedAt;

//     delete normalizedPayload.__v;

//     const oldPdfPath =
//       existingMtc.pdf
//         ?.filePath ||
//       "";

//     let newPdfData =
//       null;

//     try {
//       Object.keys(
//         normalizedPayload
//       ).forEach(
//         (key) => {
//           if (
//             key !==
//             "mtcProvider"
//           ) {
//             existingMtc.set(
//               key,
//               normalizedPayload[
//                 key
//               ]
//             );
//           }
//         }
//       );

//       existingMtc.updatedBy =
//         normalizedPayload
//           .updatedBy;

//       /* ===================================================
//          GENERATE NEW PDF
//       =================================================== */

//       newPdfData =
//         await generateMtcPdf(
//           existingMtc
//         );

//       applyPdfData(
//         existingMtc,
//         newPdfData
//       );

//       await existingMtc.save();

//       /*
//        * Remove old PDF ONLY after
//        * new PDF + database save succeed.
//        */
//       if (
//         oldPdfPath &&
//         oldPdfPath !==
//           newPdfData.filePath
//       ) {
//         deletePdfFile(
//           oldPdfPath
//         );
//       }

//       return existingMtc;
//     } catch (error) {
//       /*
//        * If new PDF failed, remove only
//        * the newly-created file.
//        *
//        * Old working PDF remains.
//        */
//       if (
//         newPdfData
//           ?.filePath
//       ) {
//         deletePdfFile(
//           newPdfData
//             .filePath
//         );
//       }

//       throw error;
//     }
//   };

// /* =========================================================
//    GET PDF
// ========================================================= */

// const getMtcPdf =
//   async (
//     id,
//     provider = ""
//   ) => {
//     const mtc =
//       await findMtcById(
//         id,
//         provider
//       );

//     if (!mtc) {
//       throw new Error(
//         "MTC certificate not found"
//       );
//     }

//     const currentProvider =
//       normalizeProvider(
//         mtc.mtcProvider
//       );

//     if (
//       currentProvider !==
//         "gloria" &&
//       currentProvider !==
//         "bharat"
//     ) {
//       throw new Error(
//         `MTC provider not handled by mtcService: ${currentProvider}`
//       );
//     }

//     const filePath =
//       mtc.pdf?.filePath;

//     if (
//       !filePath ||
//       !fs.existsSync(
//         filePath
//       )
//     ) {
//       throw new Error(
//         "MTC PDF file not found"
//       );
//     }

//     return {
//       filePath,

//       fileName:
//         mtc.pdf
//           ?.fileName ||
//         `${currentProvider}_MTC.pdf`,

//       mtcProvider:
//         mtc.mtcProvider,
//     };
//   };

// /* =========================================================
//    BUILD LIST QUERY
// ========================================================= */

// const buildMtcListQuery = (
//   filters = {}
// ) => {
//   const query = {};

//   if (
//     filters.companyName
//   ) {
//     const searchText =
//       cleanText(
//         filters.companyName
//       );

//     query.$or = [
//       {
//         messers: {
//           $regex:
//             searchText,

//           $options:
//             "i",
//         },
//       },

//       {
//         companyName: {
//           $regex:
//             searchText,

//           $options:
//             "i",
//         },
//       },

//       {
//         customerName: {
//           $regex:
//             searchText,

//           $options:
//             "i",
//         },
//       },

//       {
//         orderNo: {
//           $regex:
//             searchText,

//           $options:
//             "i",
//         },
//       },

//       {
//         tcNo: {
//           $regex:
//             searchText,

//           $options:
//             "i",
//         },
//       },

//       {
//         invoiceNo: {
//           $regex:
//             searchText,

//           $options:
//             "i",
//         },
//       },

//       {
//         heatLotNo: {
//           $regex:
//             searchText,

//           $options:
//             "i",
//         },
//       },
//     ];
//   }

//   if (
//     filters.grade
//   ) {
//     query.grade = {
//       $regex:
//         cleanText(
//           filters.grade
//         ),

//       $options:
//         "i",
//     };
//   }

//   if (
//     filters.fromDate ||
//     filters.toDate
//   ) {
//     query.mtcDate = {};

//     if (
//       filters.fromDate
//     ) {
//       const fromDate =
//         new Date(
//           filters.fromDate
//         );

//       if (
//         !Number.isNaN(
//           fromDate.getTime()
//         )
//       ) {
//         fromDate.setHours(
//           0,
//           0,
//           0,
//           0
//         );

//         query.mtcDate.$gte =
//           fromDate;
//       }
//     }

//     if (
//       filters.toDate
//     ) {
//       const toDate =
//         new Date(
//           filters.toDate
//         );

//       if (
//         !Number.isNaN(
//           toDate.getTime()
//         )
//       ) {
//         toDate.setHours(
//           23,
//           59,
//           59,
//           999
//         );

//         query.mtcDate.$lte =
//           toDate;
//       }
//     }

//     if (
//       Object.keys(
//         query.mtcDate
//       ).length ===
//       0
//     ) {
//       delete query.mtcDate;
//     }
//   }

//   return query;
// };

// /* =========================================================
//    GET MTC LIST

//    IMPORTANT:

//    This service handles Gloria/Bharat.

//    If provider is blank we restrict this
//    service to Gloria + Bharat so SBE is not
//    accidentally handled here.
// ========================================================= */

// const getMtcCertificates =
//   async (
//     filters = {}
//   ) => {
//     const requestedProvider =
//       cleanText(
//         filters.mtcProvider
//       ).toLowerCase();

//     const limit =
//       Math.min(
//         Math.max(
//           Number(
//             filters.limit
//           ) ||
//             MAX_MTC_LIST_LIMIT,
//           1
//         ),

//         MAX_MTC_LIST_LIMIT
//       );

//     const query =
//       buildMtcListQuery(
//         filters
//       );

//     if (
//       requestedProvider
//     ) {
//       if (
//         requestedProvider !==
//           "gloria" &&
//         requestedProvider !==
//           "bharat"
//       ) {
//         throw new Error(
//           `MTC provider not handled by mtcService: ${requestedProvider}`
//         );
//       }

//       query.mtcProvider =
//         requestedProvider;
//     } else {
//       /*
//        * Critical separation:
//        *
//        * Do not return SBE records from
//        * this normal service.
//        */
//       query.mtcProvider = {
//         $in: [
//           "gloria",
//           "bharat",
//         ],
//       };
//     }

//     return MtcCertificate.find(
//       query
//     )
//       .sort({
//         createdAt:
//           -1,
//       })
//       .limit(
//         limit
//       )
//       .lean();
//   };

// /* =========================================================
//    GET CHEMICAL SPECS / FRONTEND FORM CONFIG
// ========================================================= */

// const getMtcChemicalSpecs =
//   async (
//     provider =
//       "gloria"
//   ) => {
//     const normalizedProvider =
//       normalizeProvider(
//         provider
//       );

//     /* =====================================================
//        GLORIA
//     ===================================================== */

//     if (
//       normalizedProvider ===
//       "gloria"
//     ) {
//       return mtcChemicalSpecs;
//     }

//     /* =====================================================
//        BHARAT
//     ===================================================== */

//     if (
//       normalizedProvider ===
//       "bharat"
//     ) {
//       return {
//         provider:
//           "bharat",

//         label:
//           "Bharat Special Steel",

//         validationMode:
//           "manual",

//         elements: [
//           "C",
//           "Si",
//           "Mn",
//           "P",
//           "S",
//           "Cr",
//           "Mo",
//           "Ni",
//           "Al",
//           "Cu",
//           "Ti",
//           "V",
//           "Nb",
//           "B",
//         ],
//       };
//     }

//     throw new Error(
//       `MTC provider not handled by mtcService: ${normalizedProvider}`
//     );
//   };

// /* =========================================================
//    GET PROVIDERS FOR FRONTEND

//    Only providers owned by this service.
// ========================================================= */

// const getMtcProviders =
//   async () => {
//     return [
//       {
//         value:
//           "gloria",

//         label:
//           "Gloria",
//       },

//       {
//         value:
//           "bharat",

//         label:
//           "Bharat Special Steel",
//       },
//     ];
//   };

// /* =========================================================
//    DELETE GENERATED PDF SAFELY
// ========================================================= */

// const deleteGeneratedMtcPdf =
//   (mtc) => {
//     const filePath =
//       mtc?.pdf?.filePath;

//     deletePdfFile(
//       filePath
//     );
//   };

// /* =========================================================
//    REGENERATE PDF
// ========================================================= */

// const regenerateMtcPdf =
//   async (
//     id,
//     provider = ""
//   ) => {
//     const mtc =
//       await findMtcById(
//         id,
//         provider
//       );

//     if (!mtc) {
//       throw new Error(
//         "MTC certificate not found"
//       );
//     }

//     const currentProvider =
//       normalizeProvider(
//         mtc.mtcProvider
//       );

//     if (
//       currentProvider !==
//         "gloria" &&
//       currentProvider !==
//         "bharat"
//     ) {
//       throw new Error(
//         `MTC provider not handled by mtcService: ${currentProvider}`
//       );
//     }

//     const oldPdfPath =
//       mtc.pdf?.filePath ||
//       "";

//     let pdfData =
//       null;

//     try {
//       pdfData =
//         await generateMtcPdf(
//           mtc
//         );

//       applyPdfData(
//         mtc,
//         pdfData
//       );

//       await mtc.save();

//       /*
//        * Delete old PDF only after
//        * new PDF and DB save succeed.
//        */
//       if (
//         oldPdfPath &&
//         oldPdfPath !==
//           pdfData.filePath
//       ) {
//         deletePdfFile(
//           oldPdfPath
//         );
//       }

//       return mtc;
//     } catch (error) {
//       if (
//         pdfData
//           ?.filePath
//       ) {
//         deletePdfFile(
//           pdfData.filePath
//         );
//       }

//       throw error;
//     }
//   };

// /* =========================================================
//    EXPORTS
// ========================================================= */

// module.exports = {
//   createMtcCertificate,

//   updateMtcCertificate,

//   getMtcCertificateById,

//   getMtcCertificates,

//   getMtcChemicalSpecs,

//   getMtcProviders,

//   getMtcPdf,

//   regenerateMtcPdf,

//   /*
//    * Controller uses this with no provider
//    * to discover which service owns a saved
//    * certificate.
//    */
//   findMtcById,

//   generateMtcPdf,

//   generateMtcPdfBuffer,

//   getTemplateByProvider,

//   getProviderConfiguration,

//   normalizeGenericChemicalComposition,

//   deleteGeneratedMtcPdf,
// };
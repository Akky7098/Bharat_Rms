const fs = require('fs');
const path = require('path');
let cachedFonts;
// Use the same locally bundled font files and family as Sales Order PDFs.
const robotoPdfCss = () => {
  if (!cachedFonts) {
    cachedFonts = [400, 500, 700].map(weight => {
      const file = path.join(__dirname, '../node_modules/@fontsource/roboto/files', `roboto-latin-${weight}-normal.woff2`);
      const data = fs.readFileSync(file).toString('base64');
      return `@font-face { font-family: "RobotoEmbedded"; src: url("data:font/woff2;base64,${data}") format("woff2"); font-weight: ${weight}; font-style: normal; font-display: block; }`;
    }).join('\n');
  }
  return cachedFonts;
};
const managementLogoData = () => `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../public/logo.png')).toString('base64')}`;
module.exports = { robotoPdfCss, managementLogoData };

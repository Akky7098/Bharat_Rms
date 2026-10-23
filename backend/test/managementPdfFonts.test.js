const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const house = require('../templates/managementOrderAnalyticsPdfTemplate');
const { buildSteelMillOrderAnalysisPdfHtml: mill } = require('../templates/steelMillOrderAnalysisPdfTemplate');
const overview = require('../templates/steelAnalyticstemplate');
test('every management PDF embeds the same Roboto regular and bold bytes as Sales Orders', () => {
  const regular = fs.readFileSync(path.join(__dirname, '../node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2')).toString('base64');
  const bold = fs.readFileSync(path.join(__dirname, '../node_modules/@fontsource/roboto/files/roboto-latin-700-normal.woff2')).toString('base64');
  for (const html of [house(), mill(), mill({ includeCustomerName: false }), overview({})]) {
    assert.ok(html.includes(regular));
    assert.ok(html.includes(bold));
    assert.match(html, /font-family:\s*"RobotoEmbedded",/);
    assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  }
});
test('default H.O. logo is embedded so offline PDF generation does not produce a broken image', () => {
  const old = process.env.COMPANY_LOGO_URL;
  delete process.env.COMPANY_LOGO_URL;
  try { assert.match(house(), /src="data:image\/png;base64,/); }
  finally { if (old !== undefined) process.env.COMPANY_LOGO_URL = old; }
});

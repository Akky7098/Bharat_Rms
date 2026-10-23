// Explicitly load the embedded Sales Order font faces before printing.
module.exports = async function prepareManagementPdfFonts(page) {
  await page.evaluate(async () => {
    if (!document.fonts) throw new Error("PDF font loading is unavailable");
    for (const weight of [400, 700]) {
      const faces = await document.fonts.load(`${weight} 12px "RobotoEmbedded"`);
      if (!faces.length || faces.some(face => face.status !== "loaded")) {
        throw new Error(`Embedded Roboto ${weight} failed to load; PDF generation stopped`);
      }
    }
    await document.fonts.ready;
  });
  // Match the stabilization interval in the working Sales Order renderer.
  await new Promise(resolve => setTimeout(resolve, 500));
};

const Receivable = require("../model/receivableModel");
const Dispatch = require("../model/dispatchModel");
const SalesOrder = require("../model/salesOrderModel");

const normalizeCompanyName = (name = "") =>
  String(name).trim().toLowerCase().replace(/\s+/g, " ");

const isAdminUser = (user) =>
  ["admin", "super_admin", "accounts"].includes(user?.role);

const safeNumber = (value) => Number(value || 0);

/* =========================
   ACCESS FILTER
========================= */

const buildAccessFilter = (user) => {
  if (isAdminUser(user)) return {};

  return {
    "salesPersons.userId": user._id || user.id,
  };
};

/* =========================
   CREATE / UPDATE FROM DISPATCH
   Called when dispatch is created
========================= */

const createOrUpdateFromDispatch = async (dispatchId, user) => {
  const dispatch = await Dispatch.findById(dispatchId);

  if (!dispatch) {
    throw new Error("Dispatch not found");
  }

  const normalizedCompanyName = normalizeCompanyName(dispatch.companyName);

  let receivable = await Receivable.findOne({ normalizedCompanyName });

  const invoiceExists = receivable?.invoices?.some(
    (inv) => inv.invoiceNumber === dispatch.invoiceNumber
  );

  const invoiceData = {
    dispatchId: dispatch._id,
    salesOrderId: dispatch.salesOrderId,
    salesOrderNo: dispatch.salesOrderNo,
    invoiceNumber: dispatch.invoiceNumber,
    invoiceDate: dispatch.invoiceDate,
    dueDate: dispatch.paymentDueDate,
    invoiceAmount: dispatch.invoiceValue,
    receivedAmount: dispatch.paidAmount || 0,
    pendingAmount: dispatch.pendingAmount,
    status: dispatch.paymentStatus,
    source: "dispatch",
  };

  const salesPersonData = {
    userId: dispatch.salesPersonId,
    name: dispatch.salesPersonName,
    email: dispatch.salesPersonEmail,
  };

  if (!receivable) {
    receivable = new Receivable({
      companyName: dispatch.companyName,
      normalizedCompanyName,
      contactPersonName: dispatch.contactPersonName,
      contactPersonEmail: dispatch.contactPersonEmail,
      contactPersonNumber: dispatch.contactPersonNumber,
      primarySalesPersonId: dispatch.salesPersonId,
      salesPersons: [salesPersonData],
      invoices: [invoiceData],
      source: "dispatch",
    });
  } else {
    const alreadySalesPerson = receivable.salesPersons.some(
      (sp) => String(sp.userId) === String(dispatch.salesPersonId)
    );

    if (!alreadySalesPerson) {
      receivable.salesPersons.push(salesPersonData);
    }

    if (!invoiceExists) {
      receivable.invoices.push(invoiceData);
    } else {
      receivable.invoices = receivable.invoices.map((inv) => {
        if (inv.invoiceNumber === dispatch.invoiceNumber) {
          return {
            ...inv.toObject?.() || inv,
            ...invoiceData,
          };
        }
        return inv;
      });
    }

    receivable.contactPersonName =
      receivable.contactPersonName || dispatch.contactPersonName;
    receivable.contactPersonEmail =
      receivable.contactPersonEmail || dispatch.contactPersonEmail;
    receivable.contactPersonNumber =
      receivable.contactPersonNumber || dispatch.contactPersonNumber;
  }

  receivable.lastInvoiceDate = dispatch.invoiceDate;
  await receivable.save();

  return receivable;
};

/* =========================
   LIST RECEIVABLES
========================= */

const getReceivables = async (query, user) => {
  const {
    companyName,
    riskStatus,
    paymentStatus,
    page = 1,
    limit = 20,
  } = query;

  const filter = {
    isActive: true,
    ...buildAccessFilter(user),
  };

  if (companyName) {
    filter.companyName = { $regex: companyName, $options: "i" };
  }

  if (riskStatus) {
    filter.riskStatus = riskStatus;
  }

  if (paymentStatus) {
    filter["invoices.status"] = paymentStatus;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    Receivable.find(filter)
      .sort({ totalOverdueAmount: -1, oldestOverdueDays: -1, updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Receivable.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/* =========================
   GET COMPANY LEDGER
========================= */

const getCompanyLedger = async (receivableId, user) => {
  const filter = {
    _id: receivableId,
    isActive: true,
    ...buildAccessFilter(user),
  };

  const receivable = await Receivable.findOne(filter);

  if (!receivable) {
    throw new Error("Receivable ledger not found or access denied");
  }

  return receivable;
};

/* =========================
   MANUAL PAYMENT UPDATE
   For accounts/admin only
========================= */

const addManualPaymentReceipt = async (receivableId, payload, user) => {
  if (!isAdminUser(user)) {
    throw new Error("Only accounts/admin can update payment details");
  }

  const receivable = await Receivable.findById(receivableId);

  if (!receivable) {
    throw new Error("Receivable ledger not found");
  }

  const amount = safeNumber(payload.amount);
  let remainingAmount = amount;

  const adjustedInvoices = [];

  const unpaidInvoices = receivable.invoices
    .filter((inv) => safeNumber(inv.pendingAmount) > 0)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  for (const invoice of unpaidInvoices) {
    if (remainingAmount <= 0) break;

    const pending = safeNumber(invoice.pendingAmount);
    const adjustAmount = Math.min(pending, remainingAmount);

    invoice.receivedAmount = safeNumber(invoice.receivedAmount) + adjustAmount;
    invoice.lastPaymentDate = payload.receiptDate || new Date();

    adjustedInvoices.push({
      dispatchId: invoice.dispatchId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      invoiceAmount: invoice.invoiceAmount,
      adjustedAmount: adjustAmount,
      pendingAfterAdjustment: Math.max(pending - adjustAmount, 0),
    });

    remainingAmount -= adjustAmount;
  }

  receivable.paymentReceipts.push({
    receiptNumber: payload.receiptNumber,
    receiptDate: payload.receiptDate || new Date(),
    amount,
    paymentMode: payload.paymentMode || "bank_transfer",
    bankReferenceNo: payload.bankReferenceNo || "",
    tdsAmount: safeNumber(payload.tdsAmount),
    deductionAmount: safeNumber(payload.deductionAmount),
    deductionReason: payload.deductionReason || "",
    adjustedInvoices,
    source: "manual",
    remark: payload.remark || "",
    createdBy: {
      userId: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  receivable.lastPaymentDate = payload.receiptDate || new Date();

  await receivable.save();

  return receivable;
};

/* =========================
   SAFE TALLY SYNC
   IMPORTANT:
   This accepts ONLY receivable/customer ledger data.
   Do NOT send salary, purchase, expense, bank, cash, capital, GST, etc.
========================= */

const syncFromTallyReceivables = async (tallyData = [], user) => {
  if (!isAdminUser(user)) {
    throw new Error("Only accounts/admin can sync Tally data");
  }

  if (!Array.isArray(tallyData)) {
    throw new Error("Invalid Tally data format");
  }

  const allowedLedgerTypes = [
    "sundry_debtors",
    "customer",
    "sales_receivable",
  ];

  const blockedKeywords = [
    "salary",
    "wages",
    "staff",
    "employee",
    "purchase",
    "supplier",
    "vendor",
    "expense",
    "bank",
    "cash",
    "capital",
    "loan",
    "gst",
    "tds payable",
    "round off",
  ];

  let synced = 0;
  let skipped = 0;
  const errors = [];

  for (const item of tallyData) {
    try {
      const ledgerName = String(item.ledgerName || item.companyName || "");
      const normalizedLedgerName = normalizeCompanyName(ledgerName);

      const ledgerType = String(item.ledgerType || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

      const isAllowedLedger =
        allowedLedgerTypes.includes(ledgerType) ||
        item.isCustomerLedger === true;

      const hasBlockedKeyword = blockedKeywords.some((keyword) =>
        normalizedLedgerName.includes(keyword)
      );

      if (!ledgerName || !isAllowedLedger || hasBlockedKeyword) {
        skipped++;
        continue;
      }

      let receivable = await Receivable.findOne({
        normalizedCompanyName: normalizedLedgerName,
      });

      const invoices = Array.isArray(item.invoices)
        ? item.invoices
            .filter((inv) => inv.invoiceNumber && safeNumber(inv.invoiceAmount) > 0)
            .map((inv) => ({
              dispatchId: inv.dispatchId || undefined,
              salesOrderId: inv.salesOrderId || undefined,
              salesOrderNo: inv.salesOrderNo || "",
              invoiceNumber: inv.invoiceNumber,
              invoiceDate: inv.invoiceDate,
              dueDate: inv.dueDate,
              invoiceAmount: safeNumber(inv.invoiceAmount),
              receivedAmount: safeNumber(inv.receivedAmount),
              tdsAmount: safeNumber(inv.tdsAmount),
              deductionAmount: safeNumber(inv.deductionAmount),
              pendingAmount: safeNumber(inv.pendingAmount),
              tallyVoucherId: inv.tallyVoucherId || "",
              tallyBillRef: inv.tallyBillRef || "",
              source: "tally",
              syncedAt: new Date(),
            }))
        : [];

      const paymentReceipts = Array.isArray(item.paymentReceipts)
        ? item.paymentReceipts.map((receipt) => ({
            receiptNumber: receipt.receiptNumber || "",
            receiptDate: receipt.receiptDate || new Date(),
            amount: safeNumber(receipt.amount),
            paymentMode: receipt.paymentMode || "bank_transfer",
            bankReferenceNo: receipt.bankReferenceNo || "",
            tdsAmount: safeNumber(receipt.tdsAmount),
            deductionAmount: safeNumber(receipt.deductionAmount),
            deductionReason: receipt.deductionReason || "",
            adjustedInvoices: receipt.adjustedInvoices || [],
            source: "tally",
            tallyVoucherId: receipt.tallyVoucherId || "",
            remark: receipt.remark || "",
            syncedAt: new Date(),
          }))
        : [];

      if (!receivable) {
        receivable = new Receivable({
          companyName: ledgerName,
          normalizedCompanyName: normalizedLedgerName,
          tallyLedgerName: ledgerName,
          tallyLedgerGuid: item.tallyLedgerGuid || "",
          invoices,
          paymentReceipts,
          source: "tally",
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        });
      } else {
        receivable.tallyLedgerName = ledgerName;
        receivable.tallyLedgerGuid =
          item.tallyLedgerGuid || receivable.tallyLedgerGuid;

        for (const tallyInvoice of invoices) {
          const existingIndex = receivable.invoices.findIndex(
            (inv) => inv.invoiceNumber === tallyInvoice.invoiceNumber
          );

          if (existingIndex >= 0) {
            receivable.invoices[existingIndex] = {
              ...receivable.invoices[existingIndex].toObject(),
              ...tallyInvoice,
            };
          } else {
            receivable.invoices.push(tallyInvoice);
          }
        }

        for (const receipt of paymentReceipts) {
          const exists = receivable.paymentReceipts.some(
            (r) =>
              r.tallyVoucherId &&
              receipt.tallyVoucherId &&
              r.tallyVoucherId === receipt.tallyVoucherId
          );

          if (!exists) {
            receivable.paymentReceipts.push(receipt);
          }
        }

        receivable.source = "tally";
        receivable.syncStatus = "synced";
        receivable.lastSyncedAt = new Date();
        receivable.lastSyncError = "";
      }

      await receivable.save();
      synced++;
    } catch (error) {
      skipped++;
      errors.push(error.message);
    }
  }

  return {
    synced,
    skipped,
    errors,
  };
};

/* =========================
   DASHBOARD SUMMARY
========================= */

const getReceivableSummary = async (user) => {
  const filter = {
    isActive: true,
    ...buildAccessFilter(user),
  };

  const result = await Receivable.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        totalInvoiceAmount: { $sum: "$totalInvoiceAmount" },
        totalReceivedAmount: { $sum: "$totalReceivedAmount" },
        totalPendingAmount: { $sum: "$totalPendingAmount" },
        totalOverdueAmount: { $sum: "$totalOverdueAmount" },
        managementApprovalRequiredCount: {
          $sum: {
            $cond: ["$managementApprovalRequired", 1, 0],
          },
        },
      },
    },
  ]);

  return (
    result[0] || {
      totalCustomers: 0,
      totalInvoiceAmount: 0,
      totalReceivedAmount: 0,
      totalPendingAmount: 0,
      totalOverdueAmount: 0,
      managementApprovalRequiredCount: 0,
    }
  );
};

/* =========================
   ORDER RISK CHECK
   Later use in Sales Order form
========================= */

const checkCustomerRisk = async (companyName, user) => {
  const normalizedCompanyName = normalizeCompanyName(companyName);

  const receivable = await Receivable.findOne({
    normalizedCompanyName,
    isActive: true,
    ...buildAccessFilter(user),
  });

  if (!receivable) {
    return {
      found: false,
      riskStatus: "normal",
      managementApprovalRequired: false,
      message: "No receivable history found",
    };
  }

  return {
    found: true,
    companyName: receivable.companyName,
    totalPendingAmount: receivable.totalPendingAmount,
    totalOverdueAmount: receivable.totalOverdueAmount,
    oldestOverdueDays: receivable.oldestOverdueDays,
    riskStatus: receivable.riskStatus,
    managementApprovalRequired: receivable.managementApprovalRequired,
    message: receivable.managementApprovalRequired
      ? `Customer has overdue amount of ₹${receivable.totalOverdueAmount} for ${receivable.oldestOverdueDays} days. Management approval required.`
      : "Customer receivable status is normal.",
  };
};


const cleanCompanyWords = (name = "") => {
  return String(name)
    .toLowerCase()
    .replace(/private limited|pvt ltd|pvt\. ltd\.|limited|ltd|llp|india|co\.|company/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getMatchScore = (rmsName = "", tallyName = "") => {
  const rms = cleanCompanyWords(rmsName);
  const tally = cleanCompanyWords(tallyName);

  if (!rms || !tally) return 0;
  if (rms === tally) return 100;
  if (rms.includes(tally) || tally.includes(rms)) return 85;

  const rmsWords = rms.split(" ");
  const tallyWords = tally.split(" ");

  const commonWords = rmsWords.filter((w) => tallyWords.includes(w));

  return Math.round((commonWords.length / Math.max(rmsWords.length, tallyWords.length)) * 100);
};

const autoMapSalesPersonToReceivable = async (salesOrderId) => {
  const salesOrder = await SalesOrder.findById(salesOrderId);

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  const receivables = await Receivable.find({ isActive: true });

  let bestMatch = null;
  let bestScore = 0;

  for (const receivable of receivables) {
    const score = getMatchScore(
      salesOrder.companyName,
      receivable.companyName
    );

    if (score > bestScore) {
      bestScore = score;
      bestMatch = receivable;
    }
  }

  if (!bestMatch || bestScore < 80) {
    return {
      matched: false,
      message: "No strong receivable match found",
      score: bestScore,
    };
  }

  const salesPersonId =
    salesOrder.salesPersonId || salesOrder.createdBy || salesOrder.userId;

  const alreadyMapped = bestMatch.salesPersons.some(
    (sp) => String(sp.userId) === String(salesPersonId)
  );

  if (!alreadyMapped) {
    bestMatch.salesPersons.push({
      userId: salesPersonId,
      name: salesOrder.salesPersonName || salesOrder.createdByName || "",
      email: salesOrder.salesPersonEmail || "",
    });
  }

  if (!bestMatch.primarySalesPersonId) {
    bestMatch.primarySalesPersonId = salesPersonId;
  }

  await bestMatch.save();

  return {
    matched: true,
    score: bestScore,
    receivableId: bestMatch._id,
    receivableCompanyName: bestMatch.companyName,
    salesOrderCompanyName: salesOrder.companyName,
  };
};
module.exports = {
  createOrUpdateFromDispatch,
  getReceivables,
  getCompanyLedger,
  addManualPaymentReceipt,
  syncFromTallyReceivables,
  getReceivableSummary,
  checkCustomerRisk,
  autoMapSalesPersonToReceivable,
};
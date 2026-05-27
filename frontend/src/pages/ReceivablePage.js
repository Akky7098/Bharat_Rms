import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import {
  getCompanyLedger,
  getReceivableSummary,
  getReceivables,
} from "../services/receivableService";
import "./ReceivablePage.css";

function ReceivablePage() {
  const [summary, setSummary] = useState(null);
  const [receivables, setReceivables] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedLedger, setSelectedLedger] = useState(null);

  const [loading, setLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [filters, setFilters] = useState({
    companyName: "",
    riskStatus: "",
    paymentStatus: "",
    page: 1,
    limit: 20,
  });

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [summaryRes, listRes] = await Promise.all([
        getReceivableSummary(),
        getReceivables(filters),
      ]);

      setSummary(summaryRes.data);
      setReceivables(listRes.data || []);
      setPagination(listRes.pagination || null);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load receivables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.riskStatus, filters.paymentStatus]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    setTimeout(loadData, 0);
  };

  const openLedger = async (receivableId) => {
    try {
      setLedgerLoading(true);
      const response = await getCompanyLedger(receivableId);
      setSelectedLedger(response.data);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load company ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  const closeLedger = () => {
    setSelectedLedger(null);
  };

  const getRiskClass = (risk) => {
    if (risk === "blocked") return "risk-blocked";
    if (risk === "hold") return "risk-hold";
    if (risk === "watch") return "risk-watch";
    return "risk-normal";
  };

  const getStatusClass = (status) => {
    if (status === "paid") return "status-paid";
    if (status === "partial") return "status-partial";
    if (status === "overdue") return "status-overdue";
    if (status === "disputed") return "status-disputed";
    return "status-pending";
  };

  const selectedTotals = useMemo(() => {
    if (!selectedLedger) return null;

    return {
      invoice: selectedLedger.totalInvoiceAmount || 0,
      received: selectedLedger.totalReceivedAmount || 0,
      pending: selectedLedger.totalPendingAmount || 0,
      overdue: selectedLedger.totalOverdueAmount || 0,
    };
  }, [selectedLedger]);

  return (
    <div className="receivable-page">
      <div className="receivable-header">
        <div>
          <p className="receivable-eyebrow">Tally Linked Ledger</p>
          <h1>Receivables</h1>
          <span>
            Track customer outstanding, overdue payments, risk status and
            payment history.
          </span>
        </div>

        <button className="receivable-refresh-btn" onClick={loadData}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="receivable-summary-grid">
        <div className="receivable-summary-card">
          <div className="summary-icon summary-blue">
            <Building2 size={22} />
          </div>
          <div>
            <span>Total Customers</span>
            <strong>{summary?.totalCustomers || 0}</strong>
          </div>
        </div>

        <div className="receivable-summary-card">
          <div className="summary-icon summary-green">
            <Wallet size={22} />
          </div>
          <div>
            <span>Total Invoice</span>
            <strong>{formatCurrency(summary?.totalInvoiceAmount)}</strong>
          </div>
        </div>

        <div className="receivable-summary-card">
          <div className="summary-icon summary-orange">
            <Clock size={22} />
          </div>
          <div>
            <span>Pending Amount</span>
            <strong>{formatCurrency(summary?.totalPendingAmount)}</strong>
          </div>
        </div>

        <div className="receivable-summary-card danger">
          <div className="summary-icon summary-red">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span>Overdue Amount</span>
            <strong>{formatCurrency(summary?.totalOverdueAmount)}</strong>
          </div>
        </div>
      </div>

      <div className="receivable-filter-card">
        <div className="receivable-search-box">
          <Search size={18} />
          <input
            value={filters.companyName}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                companyName: e.target.value,
              }))
            }
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search company name..."
          />
        </div>

        <select
          value={filters.riskStatus}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              riskStatus: e.target.value,
              page: 1,
            }))
          }
        >
          <option value="">All Risk</option>
          <option value="normal">Normal</option>
          <option value="watch">Watch</option>
          <option value="hold">Hold</option>
          <option value="blocked">Blocked</option>
        </select>

        <select
          value={filters.paymentStatus}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              paymentStatus: e.target.value,
              page: 1,
            }))
          }
        >
          <option value="">All Payments</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>

        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="receivable-table-card">
        <div className="receivable-table-header">
          <div>
            <h3>Customer Ledger</h3>
            <span>
              Last synced data from Tally. Sales users see only mapped
              customers.
            </span>
          </div>
        </div>

        {loading ? (
          <div className="receivable-empty">Loading receivables...</div>
        ) : receivables.length === 0 ? (
          <div className="receivable-empty">No receivable data found.</div>
        ) : (
          <div className="receivable-table-wrap">
            <table className="receivable-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Total Invoice</th>
                  <th>Received</th>
                  <th>Pending</th>
                  <th>Overdue</th>
                  <th>Oldest Due</th>
                  <th>Risk</th>
                  <th>Last Sync</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {receivables.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="company-cell">
                        <strong>{item.companyName}</strong>
                        <span>{item.tallyLedgerName || "Tally Ledger"}</span>
                      </div>
                    </td>

                    <td>{formatCurrency(item.totalInvoiceAmount)}</td>
                    <td className="text-green">
                      {formatCurrency(item.totalReceivedAmount)}
                    </td>
                    <td className="text-orange">
                      {formatCurrency(item.totalPendingAmount)}
                    </td>
                    <td className="text-red">
                      {formatCurrency(item.totalOverdueAmount)}
                    </td>
                    <td>
                      {item.oldestOverdueDays > 0
                        ? `${item.oldestOverdueDays} days`
                        : "-"}
                    </td>
                    <td>
                      <span className={`risk-pill ${getRiskClass(item.riskStatus)}`}>
                        {item.riskStatus}
                      </span>
                    </td>
                    <td>{formatDate(item.lastSyncedAt)}</td>
                    <td>
                      <button
                        className="view-ledger-btn"
                        onClick={() => openLedger(item._id)}
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <div className="receivable-pagination">
            <button
              disabled={filters.page <= 1}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Previous
            </button>

            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>

            <button
              disabled={filters.page >= pagination.totalPages}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Next
            </button>
          </div>
        )}
      </div>

      {(selectedLedger || ledgerLoading) && (
        <div className="ledger-overlay">
          <div className="ledger-drawer">
            {ledgerLoading ? (
              <div className="receivable-empty">Loading ledger...</div>
            ) : (
              <>
                <div className="ledger-header">
                  <div>
                    <p>Company Ledger</p>
                    <h2>{selectedLedger.companyName}</h2>
                    <span>
                      Last synced: {formatDate(selectedLedger.lastSyncedAt)}
                    </span>
                  </div>

                  <button onClick={closeLedger}>
                    <X size={20} />
                  </button>
                </div>

                {selectedLedger.managementApprovalRequired && (
                  <div className="ledger-warning">
                    <AlertTriangle size={19} />
                    <div>
                      <strong>Management approval required</strong>
                      <span>
                        Customer has overdue amount of{" "}
                        {formatCurrency(selectedLedger.totalOverdueAmount)} for{" "}
                        {selectedLedger.oldestOverdueDays} days.
                      </span>
                    </div>
                  </div>
                )}

                <div className="ledger-total-grid">
                  <div>
                    <span>Total Invoice</span>
                    <strong>{formatCurrency(selectedTotals.invoice)}</strong>
                  </div>
                  <div>
                    <span>Payment Done</span>
                    <strong className="text-green">
                      {formatCurrency(selectedTotals.received)}
                    </strong>
                  </div>
                  <div>
                    <span>Payment Needed</span>
                    <strong className="text-orange">
                      {formatCurrency(selectedTotals.pending)}
                    </strong>
                  </div>
                  <div>
                    <span>Overdue</span>
                    <strong className="text-red">
                      {formatCurrency(selectedTotals.overdue)}
                    </strong>
                  </div>
                </div>

                <div className="ledger-section">
                  <h3>Invoice History</h3>

                  <div className="ledger-table-wrap">
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Invoice Date</th>
                          <th>Due Date</th>
                          <th>Amount</th>
                          <th>Received</th>
                          <th>Pending</th>
                          <th>Overdue</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(selectedLedger.invoices || []).map((inv, index) => (
                          <tr key={`${inv.invoiceNumber}-${index}`}>
                            <td>
                              <strong>{inv.invoiceNumber}</strong>
                            </td>
                            <td>{formatDate(inv.invoiceDate)}</td>
                            <td>{formatDate(inv.dueDate)}</td>
                            <td>{formatCurrency(inv.invoiceAmount)}</td>
                            <td className="text-green">
                              {formatCurrency(inv.receivedAmount)}
                            </td>
                            <td className="text-orange">
                              {formatCurrency(inv.pendingAmount)}
                            </td>
                            <td>
                              {inv.overdueDays > 0
                                ? `${inv.overdueDays} days`
                                : "-"}
                            </td>
                            <td>
                              <span
                                className={`status-pill ${getStatusClass(
                                  inv.status
                                )}`}
                              >
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="ledger-section">
                  <h3>Payment History</h3>

                  {selectedLedger.paymentReceipts?.length ? (
                    <div className="payment-history-list">
                      {selectedLedger.paymentReceipts.map((payment, index) => (
                        <div className="payment-history-card" key={index}>
                          <div>
                            <strong>{formatCurrency(payment.amount)}</strong>
                            <span>
                              {payment.receiptNumber || "Receipt"} •{" "}
                              {formatDate(payment.receiptDate)}
                            </span>
                          </div>
                          <p>{payment.remark || "Payment received"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ledger-no-payment">
                      <CheckCircle2 size={18} />
                      No separate receipt history synced yet. Current received
                      amount is calculated from Tally bill outstanding.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceivablePage;
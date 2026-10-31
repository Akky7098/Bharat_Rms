# API-backed question coverage and implementation backlog

Inventory: 179 defined endpoints across 30 route files plus app.js/server.js. Dynamic attendance routes are expanded; unresolved mounts are not claimed as live APIs.
Generated from active router calls, excluding commented-out code. Paths are relative when a mount
could not be resolved statically. This inventory does not execute any API. Handler names describe
API functionality; candidate questions below are a backlog, not enabled chatbot features.

Write/approval/authentication endpoints remain app actions, never free-form chat commands.
GET does not automatically mean harmless: PDF/download/send/diagnostic routes need individual review.

See ask-bharat-api-question-plan.md for reviewed question families and access decisions.

## appPushRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/app-push/register` | authMiddleware, appPushController.registerToken | App action; no automatic chat execution | appPushRoutes.js:7 |
| POST | `/api/app-push/unregister` | authMiddleware, appPushController.unregisterToken | App action; no automatic chat execution | appPushRoutes.js:8 |

## attendanceRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/attendance/check-in` | attendanceController.checkIn | App action; no automatic chat execution | attendanceRoutes.js:18 |
| POST | `/api/attendance/check-out` | attendanceController.checkOut | App action; no automatic chat execution | attendanceRoutes.js:23 |
| GET | `/api/attendance/today` | attendanceController.getTodayAttendance | Review read/report candidate | attendanceRoutes.js:28 |
| POST | `/api/attendance/location/checkpoint` | attendanceController.createLocationCheckpoint | App action; no automatic chat execution | attendanceRoutes.js:45 |
| GET | `/api/attendance/location/status` | attendanceController.getMyLocationTrackingStatus | Review read/report candidate | attendanceRoutes.js:54 |
| GET | `/api/attendance/location/history/:employeeId` | attendanceController.getEmployeeLocationHistory | Review read/report candidate | attendanceRoutes.js:70 |
| GET | `/api/attendance/` | attendanceController.getAttendanceList | Review read/report candidate | attendanceRoutes.js:75 |
| POST | `/api/attendance/regularize` | attendanceController.requestRegularization | App action; no automatic chat execution | attendanceRoutes.js:84 |
| PATCH | `/api/attendance/:attendanceId/regularize/approve` | attendanceController.approveRegularization | Operational/access/action route; not a chat report | attendanceRoutes.js:89 |
| PATCH | `/api/attendance/:attendanceId/regularize/reject` | attendanceController.rejectRegularization | App action; no automatic chat execution | attendanceRoutes.js:94 |
| PATCH | `/api/attendance/employees/:employeeId/work-mode` | attendanceController.updateEmployeeWorkMode | App action; no automatic chat execution | attendanceRoutes.js:105 |
| POST | `/api/attendance/leave` | attendanceController.applyLeave | App action; no automatic chat execution | attendanceRoutes.js:128 |
| GET | `/api/attendance/leave/summary` | attendanceController.getMyLeaveSummary | Review read/report candidate | attendanceRoutes.js:133 |
| GET | `/api/attendance/leave/requests` | attendanceController.getLeaveRequests | Review read/report candidate | attendanceRoutes.js:138 |
| PATCH | `/api/attendance/leave/:leaveRequestId/approve` | attendanceController.approveLeave | Operational/access/action route; not a chat report | attendanceRoutes.js:143 |
| PATCH | `/api/attendance/leave/:leaveRequestId/reject` | attendanceController.rejectLeave | App action; no automatic chat execution | attendanceRoutes.js:148 |
| PATCH | `/api/attendance/leave/:leaveRequestId/cancel` | attendanceController.cancelLeave | App action; no automatic chat execution | attendanceRoutes.js:153 |
| GET | `/api/attendance/employees` | inline handler | Review read/report candidate | attendanceRoutes.js:159 |
| POST | `/api/attendance/work-from-home` | inline handler | App action; no automatic chat execution | attendanceRoutes.js:174 |
| POST | `/api/attendance/short-leave` | inline handler | App action; no automatic chat execution | attendanceRoutes.js:174 |
| GET | `/api/attendance/work-from-home` | inline handler | Review read/report candidate | attendanceRoutes.js:175 |
| GET | `/api/attendance/short-leave` | inline handler | Review read/report candidate | attendanceRoutes.js:175 |
| PATCH | `/api/attendance/work-from-home/:requestId/approve` | inline handler | App action; no automatic chat execution | attendanceRoutes.js:176 |
| PATCH | `/api/attendance/work-from-home/:requestId/reject` | inline handler | App action; no automatic chat execution | attendanceRoutes.js:176 |
| PATCH | `/api/attendance/short-leave/:requestId/approve` | inline handler | App action; no automatic chat execution | attendanceRoutes.js:176 |
| PATCH | `/api/attendance/short-leave/:requestId/reject` | inline handler | App action; no automatic chat execution | attendanceRoutes.js:176 |

## authRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | authController.login | App action; no automatic chat execution | authRoutes.js:5 |
| POST | `/api/auth/google` | authController.googleLogin | App action; no automatic chat execution | authRoutes.js:6 |
| POST | `/api/auth/google/link` | require, util, auth, authController.linkGoogle | App action; no automatic chat execution | authRoutes.js:7 |

## baileysStatusRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/baileys/status` | getStatus | Review read/report candidate | baileysStatusRoutes.js:21 |
| GET | `/api/baileys/qr` | showQrPage | Operational/access/action route; not a chat report | baileysStatusRoutes.js:26 |
| GET | `/api/baileys/groups` | getGroups | Review read/report candidate | baileysStatusRoutes.js:31 |

## bharatAiRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/bharat-ai/me` | protect, getBharatAiCurrentUser | Review read/report candidate | bharatAiRoutes.js:27 |
| GET | `/api/bharat-ai/question-review` | protect, require, controller, bharatQuestionReviewController, reviewDatabaseQuestions | Review read/report candidate | bharatAiRoutes.js:33 |
| POST | `/api/bharat-ai/chat` | protect, chatWithBharatAi | App action; no automatic chat execution | bharatAiRoutes.js:42 |

## coldCallRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/cold-call/create` | authMiddleware, coldCallController.createColdCall | App action; no automatic chat execution | coldCallRoutes.js:7 |
| GET | `/api/cold-call/` | authMiddleware, coldCallController.getAllColdCalls | Review read/report candidate | coldCallRoutes.js:13 |

## customerOrderTrackingPageRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/track-order/:token` | customerOrderTrackingPageController, renderCustomerOrderTrackingPage | Review read/report candidate | customerOrderTrackingPageRoutes.js:24 |

## customerOrderTrackingRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/customer-order-tracking/:token` | customerOrderTrackingController, getCustomerOrderTracking | Review read/report candidate | customerOrderTrackingRoutes.js:21 |

## dashboardRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/dashboard/summary` | authMiddleware, dashboardController.getDashboardSummary | Review read/report candidate | dashboardRoutes.js:8 |
| GET | `/api/dashboard/action-required` | authMiddleware, dashboardController.getActionRequiredInsights | Review read/report candidate | dashboardRoutes.js:15 |
| GET | `/api/dashboard/cashflow` | authMiddleware, dashboardController.getCashflowSummary | Review read/report candidate | dashboardRoutes.js:22 |
| GET | `/api/dashboard/mis-scoring` | authMiddleware, dashboardController.getMisScoring | Review read/report candidate | dashboardRoutes.js:27 |

## dispatchRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/dispatch/sales-orders/search` | authMiddleware, dispatchController, searchPendingDispatchSalesOrders | Review read/report candidate | dispatchRoutes.js:27 |
| POST | `/api/dispatch/create` | authMiddleware, dispatchUpload.fields, name, billPdf, maxCount, name, lrCopyPdf, maxCount, name, tcCertificatePdf, maxCount, dispatchController, createDispatch | App action; no automatic chat execution | dispatchRoutes.js:61 |
| GET | `/api/dispatch/` | authMiddleware, dispatchController, getAllDispatches | Review read/report candidate | dispatchRoutes.js:94 |
| PATCH | `/api/dispatch/:dispatchId/payment` | authMiddleware, dispatchUpload.single, paymentBillPdf, dispatchController, updateDispatchPayment | App action; no automatic chat execution | dispatchRoutes.js:111 |
| PATCH | `/api/dispatch/:dispatchId/status` | authMiddleware, dispatchController, updateDispatchStatus | App action; no automatic chat execution | dispatchRoutes.js:131 |
| GET | `/api/dispatch/:dispatchId` | authMiddleware, dispatchController, getDispatchById | Review read/report candidate | dispatchRoutes.js:147 |
| DELETE | `/api/dispatch/:dispatchId` | authMiddleware, dispatchController, deleteDispatch | App action; no automatic chat execution | dispatchRoutes.js:163 |

## documentRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/documents/folders` | authMiddleware, documentController.createFolder | App action; no automatic chat execution | documentRoutes.js:8 |
| GET | `/api/documents/folders` | authMiddleware, documentController.getAllFolders | Review read/report candidate | documentRoutes.js:10 |
| DELETE | `/api/documents/folders/:folderId` | authMiddleware, documentController.deleteFolder | App action; no automatic chat execution | documentRoutes.js:12 |
| POST | `/api/documents/upload` | authMiddleware, uploadDocument.single, file, documentController.uploadDocument | App action; no automatic chat execution | documentRoutes.js:19 |
| GET | `/api/documents/` | authMiddleware, documentController.getAllDocuments | Review read/report candidate | documentRoutes.js:26 |
| GET | `/api/documents/:documentId` | authMiddleware, documentController.getDocumentById | Review read/report candidate | documentRoutes.js:28 |
| DELETE | `/api/documents/:documentId` | authMiddleware, documentController.deleteDocument | App action; no automatic chat execution | documentRoutes.js:34 |

## enquiryLookupRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/enquiry-lookup/sales-order/:enquiryNumber` | authMiddleware, enquiryLookupController.lookupEnquiryForSalesOrder | Review read/report candidate | enquiryLookupRoutes.js:7 |

## enquiryRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/enquiry/product-config` | authMiddleware, enquiryController.getProductConfig | Review read/report candidate | enquiryRoutes.js:7 |
| POST | `/api/enquiry/create` | authMiddleware, uploadEnquirySizePdf.single, sizePdf, enquiryController.createEnquiry | App action; no automatic chat execution | enquiryRoutes.js:14 |
| POST | `/api/enquiry/:id/update-workflow` | authMiddleware, enquiryController.updateWorkflow | App action; no automatic chat execution | enquiryRoutes.js:21 |
| GET | `/api/enquiry/` | authMiddleware, enquiryController.getAllEnquiries | Review read/report candidate | enquiryRoutes.js:26 |
| GET | `/api/enquiry/lost-reasons` | authMiddleware, enquiryController.getLostEnquiryReasons | Review read/report candidate | enquiryRoutes.js:32 |

## itSupportRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/it-support/stats` | itSupportController.getStats | Review read/report candidate | itSupportRoutes.js:66 |
| GET | `/api/it-support/assignable-users` | itSupportController.getAssignableUsers | Review read/report candidate | itSupportRoutes.js:67 |
| POST | `/api/it-support/tickets` | upload.array, attachments, itSupportController.createTicket | App action; no automatic chat execution | itSupportRoutes.js:69 |
| GET | `/api/it-support/tickets` | itSupportController.getTickets | Review read/report candidate | itSupportRoutes.js:75 |
| GET | `/api/it-support/tickets/:ticketId` | itSupportController.getTicketById | Review read/report candidate | itSupportRoutes.js:76 |
| POST | `/api/it-support/tickets/:ticketId/messages` | upload.array, attachments, itSupportController.addTicketMessage | App action; no automatic chat execution | itSupportRoutes.js:78 |
| PATCH | `/api/it-support/tickets/:ticketId/status` | itSupportController.updateTicketStatus | App action; no automatic chat execution | itSupportRoutes.js:84 |
| PATCH | `/api/it-support/tickets/:ticketId/details` | itSupportController.updateTicketDetails | App action; no automatic chat execution | itSupportRoutes.js:85 |
| PATCH | `/api/it-support/tickets/:ticketId/reassign` | itSupportController.reassignTicket | App action; no automatic chat execution | itSupportRoutes.js:86 |
| DELETE | `/api/it-support/tickets/:ticketId` | itSupportController.deleteTicket | App action; no automatic chat execution | itSupportRoutes.js:87 |
| POST | `/api/it-support/content` | upload.array, attachments, itSupportController.createContent | App action; no automatic chat execution | itSupportRoutes.js:90 |
| GET | `/api/it-support/content` | itSupportController.getContent | Review read/report candidate | itSupportRoutes.js:96 |
| PATCH | `/api/it-support/content/:contentId` | upload.array, attachments, itSupportController.updateContent | App action; no automatic chat execution | itSupportRoutes.js:98 |
| DELETE | `/api/it-support/content/:contentId` | itSupportController.deleteContent | App action; no automatic chat execution | itSupportRoutes.js:104 |

## logisticsAnalyticsRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/logistics-analysis/` | getLogisticsAnalysis | Review read/report candidate | logisticsAnalyticsRoutes.js:58 |
| GET | `/api/logistics-analysis/details` | getLogisticsDetails | Review read/report candidate | logisticsAnalyticsRoutes.js:86 |

## managementOrderAnalyticsRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/management-order-analysis/` | getManagementOrderAnalysis | Review read/report candidate | managementOrderAnalyticsRoutes.js:35 |
| GET | `/api/management-order-analysis/house` | require, util, auth, require, util, role, super_admin, getHouseOrderAnalysis | Review read/report candidate | managementOrderAnalyticsRoutes.js:55 |
| GET | `/api/management-order-analysis/house/pdf` | downloadHouseOrderAnalysisPdf | Review read/report candidate | managementOrderAnalyticsRoutes.js:75 |
| GET | `/api/management-order-analysis/mill` | getSteelMillAnalysis | Review read/report candidate | managementOrderAnalyticsRoutes.js:100 |
| GET | `/api/management-order-analysis/mill/pdf` | downloadSteelMillOrderAnalysisPdf | Review read/report candidate | managementOrderAnalyticsRoutes.js:148 |
| GET | `/api/management-order-analysis/grade` | getGradeAnalysis | Review read/report candidate | managementOrderAnalyticsRoutes.js:167 |

## mtcRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/mtc/providers` | authMiddleware, mtcController.getMtcProviders | Review read/report candidate | mtcRoutes.js:23 |
| GET | `/api/mtc/chemical-specs` | authMiddleware, mtcController, getMtcChemicalSpecs | Review read/report candidate | mtcRoutes.js:44 |
| GET | `/api/mtc/` | authMiddleware, mtcController, getMtcCertificates | Review read/report candidate | mtcRoutes.js:67 |
| POST | `/api/mtc/` | authMiddleware, mtcController, createMtcCertificate | App action; no automatic chat execution | mtcRoutes.js:88 |
| GET | `/api/mtc/:id/download` | authMiddleware, mtcController, downloadMtcPdf | Review read/report candidate | mtcRoutes.js:104 |
| POST | `/api/mtc/:id/regenerate` | authMiddleware, mtcController, regenerateMtcPdf | App action; no automatic chat execution | mtcRoutes.js:120 |
| GET | `/api/mtc/:id` | authMiddleware, mtcController, getMtcCertificateById | Review read/report candidate | mtcRoutes.js:136 |
| PATCH | `/api/mtc/:id` | authMiddleware, mtcController, updateMtcCertificate | App action; no automatic chat execution | mtcRoutes.js:153 |

## notificationRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/notifications/` | authMiddleware, notificationController.getNotifications | Review read/report candidate | notificationRoutes.js:8 |
| PATCH | `/api/notifications/read-all` | authMiddleware, notificationController.markAllAsRead | App action; no automatic chat execution | notificationRoutes.js:15 |
| PATCH | `/api/notifications/:id/read` | authMiddleware, notificationController.markAsRead | App action; no automatic chat execution | notificationRoutes.js:22 |
| PATCH | `/api/notifications/:id/clear` | authMiddleware, notificationController.clearNotification | App action; no automatic chat execution | notificationRoutes.js:27 |

## orderTrackingRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/order-tracking/sync` | authMiddleware, orderTrackingController.syncApprovedSalesOrders | App action; no automatic chat execution | orderTrackingRoutes.js:33 |
| POST | `/api/order-tracking/sync/:salesOrderId` | authMiddleware, orderTrackingController.syncSalesOrder | App action; no automatic chat execution | orderTrackingRoutes.js:49 |
| GET | `/api/order-tracking/` | authMiddleware, orderTrackingController.getAllOrderTrackings | Review read/report candidate | orderTrackingRoutes.js:62 |
| GET | `/api/order-tracking/sales-order/:salesOrderId` | authMiddleware, orderTrackingController.getTrackingBySalesOrderId | Review read/report candidate | orderTrackingRoutes.js:72 |
| GET | `/api/order-tracking/track/:trackingNumber` | authMiddleware, orderTrackingController.getTrackingByNumber | Review read/report candidate | orderTrackingRoutes.js:82 |
| PATCH | `/api/order-tracking/:id/milestones/:milestoneId/complete` | authMiddleware, orderTrackingController.completeMilestone | App action; no automatic chat execution | orderTrackingRoutes.js:111 |
| PATCH | `/api/order-tracking/:id/milestones/:milestoneId/estimated-date` | authMiddleware, orderTrackingController.updateEstimatedDate | App action; no automatic chat execution | orderTrackingRoutes.js:121 |
| PATCH | `/api/order-tracking/:id/transporter` | authMiddleware, orderTrackingController.updateTransporter | App action; no automatic chat execution | orderTrackingRoutes.js:131 |
| GET | `/api/order-tracking/:id` | authMiddleware, orderTrackingController.getOrderTrackingById | Review read/report candidate | orderTrackingRoutes.js:144 |

## pdfDocumentRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/pdf-documents/create` | authMiddleware, pdfDocumentController.createPdfDocument | App action; no automatic chat execution | pdfDocumentRoutes.js:18 |
| POST | `/api/pdf-documents/:id/generate-pdf` | authMiddleware, pdfDocumentController.generatePdfDocument | App action; no automatic chat execution | pdfDocumentRoutes.js:31 |
| GET | `/api/pdf-documents/` | authMiddleware, pdfDocumentController.getAllPdfDocuments | Review read/report candidate | pdfDocumentRoutes.js:44 |
| GET | `/api/pdf-documents/:id` | authMiddleware, pdfDocumentController.getPdfDocumentById | Review read/report candidate | pdfDocumentRoutes.js:57 |
| PUT | `/api/pdf-documents/update/:id` | authMiddleware, pdfDocumentController.updatePdfDocument | App action; no automatic chat execution | pdfDocumentRoutes.js:70 |
| PATCH | `/api/pdf-documents/:id/pdf` | authMiddleware, pdfDocumentController.updatePdfDetails | App action; no automatic chat execution | pdfDocumentRoutes.js:83 |
| DELETE | `/api/pdf-documents/:id` | authMiddleware, pdfDocumentController.deletePdfDocument | App action; no automatic chat execution | pdfDocumentRoutes.js:96 |

## priceContractRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `(mount unresolved)/create` | authMiddleware, priceContractController.createPriceContract | App action; no automatic chat execution | priceContractRoutes.js:16 |
| POST | `(mount unresolved)/:id/generate-pdf` | authMiddleware, priceContractController.generatePriceContractPdf | App action; no automatic chat execution | priceContractRoutes.js:31 |
| GET | `(mount unresolved)/` | authMiddleware, priceContractController.getAllPriceContracts | Review read/report candidate | priceContractRoutes.js:46 |
| GET | `(mount unresolved)/:id` | authMiddleware, priceContractController.getPriceContractById | Review read/report candidate | priceContractRoutes.js:61 |
| PUT | `(mount unresolved)/update/:id` | authMiddleware, priceContractController.updatePriceContract | App action; no automatic chat execution | priceContractRoutes.js:76 |
| PATCH | `(mount unresolved)/:id/pdf` | authMiddleware, priceContractController.updatePdfDetails | App action; no automatic chat execution | priceContractRoutes.js:91 |
| DELETE | `(mount unresolved)/:id` | authMiddleware, priceContractController.deletePriceContract | App action; no automatic chat execution | priceContractRoutes.js:106 |

## pushSubscriptionRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/push-subscriptions/public-key` | authMiddleware, pushSubscriptionController.getPublicKey | Operational/access/action route; not a chat report | pushSubscriptionRoutes.js:7 |
| POST | `/api/push-subscriptions/subscribe` | authMiddleware, pushSubscriptionController.subscribe | App action; no automatic chat execution | pushSubscriptionRoutes.js:13 |
| POST | `/api/push-subscriptions/unsubscribe` | authMiddleware, pushSubscriptionController.unsubscribe | App action; no automatic chat execution | pushSubscriptionRoutes.js:19 |

## receivableRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/receivables/summary` | auth, receivableController.getReceivableSummary | Review read/report candidate | receivableRoutes.js:7 |
| GET | `/api/receivables/` | auth, receivableController.getReceivables | Review read/report candidate | receivableRoutes.js:9 |
| GET | `/api/receivables/risk-check` | auth, receivableController.checkCustomerRisk | Review read/report candidate | receivableRoutes.js:11 |
| GET | `/api/receivables/:receivableId` | auth, receivableController.getCompanyLedger | Review read/report candidate | receivableRoutes.js:13 |
| POST | `/api/receivables/from-dispatch/:dispatchId` | auth, receivableController.createFromDispatch | App action; no automatic chat execution | receivableRoutes.js:15 |
| POST | `/api/receivables/auto-map-sales-order/:salesOrderId` | auth, receivableController.autoMapSalesPersonToReceivable | App action; no automatic chat execution | receivableRoutes.js:20 |
| PATCH | `/api/receivables/:receivableId/payment` | auth, receivableController.addManualPaymentReceipt | App action; no automatic chat execution | receivableRoutes.js:25 |
| POST | `/api/receivables/tally-sync` | auth, receivableController.syncFromTallyReceivables | App action; no automatic chat execution | receivableRoutes.js:31 |

## salesOrderRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/sales-order/create` | authMiddleware, uploadSalesOrderFiles.fields, name, customerPOFile, maxCount, name, feasibilityReportFile, maxCount, salesOrderController.createSalesOrder | App action; no automatic chat execution | salesOrderRoutes.js:15 |
| POST | `/api/sales-order/:id/generate-pdf` | authMiddleware, salesOrderController.generateSalesOrderPdf | App action; no automatic chat execution | salesOrderRoutes.js:55 |
| GET | `/api/sales-order/` | authMiddleware, salesOrderController.getAllSalesOrders | Review read/report candidate | salesOrderRoutes.js:65 |
| GET | `/api/sales-order/pending-dispatch-search` | authMiddleware, salesOrderController.searchPendingDispatchSalesOrders | Review read/report candidate | salesOrderRoutes.js:75 |
| GET | `/api/sales-order/whatsapp/webhook` | salesOrderController.verifyWhatsappWebhook | Operational/access/action route; not a chat report | salesOrderRoutes.js:85 |
| POST | `/api/sales-order/whatsapp/webhook` | salesOrderController.handleWhatsappWebhook | Operational/access/action route; not a chat report | salesOrderRoutes.js:90 |
| GET | `/api/sales-order/:id/comments` | authMiddleware, salesOrderController.getSalesOrderComments | Review read/report candidate | salesOrderRoutes.js:105 |
| POST | `/api/sales-order/:id/comments` | authMiddleware, salesOrderController.addSalesOrderComment | App action; no automatic chat execution | salesOrderRoutes.js:111 |
| GET | `/api/sales-order/:id` | authMiddleware, salesOrderController.getSalesOrderById | Review read/report candidate | salesOrderRoutes.js:121 |
| PUT | `/api/sales-order/update/:id` | authMiddleware, uploadSalesOrderFiles.fields, name, customerPOFile, maxCount, name, feasibilityReportFile, maxCount, salesOrderController.updateSalesOrder | App action; no automatic chat execution | salesOrderRoutes.js:131 |
| PATCH | `/api/sales-order/:id/admin-approve` | authMiddleware, salesOrderController.approveSalesOrderByAdmin | Operational/access/action route; not a chat report | salesOrderRoutes.js:151 |
| PATCH | `/api/sales-order/:id/admin-reject` | authMiddleware, salesOrderController.rejectSalesOrderByAdmin | App action; no automatic chat execution | salesOrderRoutes.js:161 |
| PATCH | `/api/sales-order/:id/manager-approve` | authMiddleware, salesOrderController.approveSalesOrderByManager | Operational/access/action route; not a chat report | salesOrderRoutes.js:171 |
| PATCH | `/api/sales-order/:id/manager-reject` | authMiddleware, salesOrderController.rejectSalesOrderByManager | App action; no automatic chat execution | salesOrderRoutes.js:181 |
| PATCH | `/api/sales-order/:id/pdf` | authMiddleware, salesOrderController.updatePdfDetails | App action; no automatic chat execution | salesOrderRoutes.js:201 |
| PATCH | `/api/sales-order/:id/whatsapp-group` | authMiddleware, salesOrderController.updateWhatsappGroupStatus | App action; no automatic chat execution | salesOrderRoutes.js:211 |
| DELETE | `/api/sales-order/:id` | authMiddleware, salesOrderController.deleteSalesOrder | App action; no automatic chat execution | salesOrderRoutes.js:221 |

## steelAnalyticsRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/steel-analytics/` | getSteelAnalytics | Review read/report candidate | steelAnalyticsRoutes.js:35 |
| GET | `/api/steel-analytics/summary` | getSteelAnalyticsSummary | Review read/report candidate | steelAnalyticsRoutes.js:47 |
| GET | `/api/steel-analytics/drill-down` | getSteelAnalyticsDrillDown | Review read/report candidate | steelAnalyticsRoutes.js:67 |
| GET | `/api/steel-analytics/pdf` | downloadSteelAnalyticsPdf | Review read/report candidate | steelAnalyticsRoutes.js:110 |

## supportTicketRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/support-tickets/stats` | supportTicketController.getTicketStats | Review read/report candidate | supportTicketRoutes.js:36 |
| GET | `/api/support-tickets/assignable-users` | supportTicketController.getAssignableUsers | Review read/report candidate | supportTicketRoutes.js:37 |
| POST | `/api/support-tickets/` | upload.array, attachments, supportTicketController.createTicket | App action; no automatic chat execution | supportTicketRoutes.js:39 |
| GET | `/api/support-tickets/` | supportTicketController.getTickets | Review read/report candidate | supportTicketRoutes.js:45 |
| GET | `/api/support-tickets/:ticketId` | supportTicketController.getTicketById | Review read/report candidate | supportTicketRoutes.js:46 |
| POST | `/api/support-tickets/:ticketId/messages` | upload.array, attachments, supportTicketController.addTicketMessage | App action; no automatic chat execution | supportTicketRoutes.js:48 |
| PATCH | `/api/support-tickets/:ticketId/status` | supportTicketController.updateTicketStatus | App action; no automatic chat execution | supportTicketRoutes.js:54 |
| PATCH | `/api/support-tickets/:ticketId/details` | supportTicketController.updateTicketDetails | App action; no automatic chat execution | supportTicketRoutes.js:55 |
| PATCH | `/api/support-tickets/:ticketId/reassign` | supportTicketController.reassignTicket | App action; no automatic chat execution | supportTicketRoutes.js:56 |
| DELETE | `/api/support-tickets/:ticketId` | supportTicketController.deleteTicket | App action; no automatic chat execution | supportTicketRoutes.js:58 |

## timesheetRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| POST | `/api/timesheet/create` | authMiddleware, timesheetController.createTimesheet | App action; no automatic chat execution | timesheetRoutes.js:7 |
| GET | `/api/timesheet/` | authMiddleware, timesheetController.getTimesheets | Review read/report candidate | timesheetRoutes.js:8 |

## userRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/user/sales-persons` | authMiddleware, roleAuth, admin, super_admin, userController.getSalesPersons | Review read/report candidate | userRoutes.js:8 |
| GET | `/api/user/` | authMiddleware, roleAuth, super_admin, userController.getUserAccounts | Review read/report candidate | userRoutes.js:15 |
| PATCH | `/api/user/:id/status` | authMiddleware, roleAuth, super_admin, userController.setUserStatus | App action; no automatic chat execution | userRoutes.js:16 |

## whatsappApprovalRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/whatsapp-approval/approve/:id/:token` | whatsappApprovalController.approveFromWhatsapp | Operational/access/action route; not a chat report | whatsappApprovalRoutes.js:6 |
| POST | `/api/whatsapp-approval/approve/:id/:token` | whatsappApprovalController.approveFromWhatsapp | Operational/access/action route; not a chat report | whatsappApprovalRoutes.js:7 |
| GET | `/api/whatsapp-approval/hold-form/:id/:token` | whatsappApprovalController.holdForm | Operational/access/action route; not a chat report | whatsappApprovalRoutes.js:9 |
| POST | `/api/whatsapp-approval/hold/:id/:token` | whatsappApprovalController.submitHoldFromWhatsapp | Operational/access/action route; not a chat report | whatsappApprovalRoutes.js:10 |
| GET | `/api/whatsapp-approval/pdf/:id/:token` | whatsappApprovalController.openPdfFromWhatsapp | Operational/access/action route; not a chat report | whatsappApprovalRoutes.js:12 |

## whatsappStatusRoutes.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/whatsapp/status` | whatsappStatusController.getWhatsappStatus | Review read/report candidate | whatsappStatusRoutes.js:6 |
| GET | `/api/whatsapp/status-page` | whatsappStatusController.showWhatsappQrPage | Review read/report candidate | whatsappStatusRoutes.js:7 |
| GET | `/api/whatsapp/restart-page` | whatsappStatusController.restartWhatsappPage | Operational/access/action route; not a chat report | whatsappStatusRoutes.js:8 |

## app.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/cors-test` | inline handler | Review read/report candidate | app.js:606 |

## server.js

| Method | API | Middleware / handler | Chat decision | Source |
| --- | --- | --- | --- | --- |
| GET | `/` | inline handler | Review read/report candidate | server.js:231 |


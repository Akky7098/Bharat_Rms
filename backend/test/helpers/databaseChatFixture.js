const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture(options={}) {
  const calls = [];
  const audits=[];
  const chain = rows => ({ select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => rows });
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../services/bharat-ai/databaseChatService.js'),'utf8'), {
    module, Date, Intl, console,
    require(name) {
      assert.ok(!/provider|gemini|genai/.test(name));
      if (name.includes('databaseQuestionParser')) return {parseQuestion: text => require('../../services/bharat-ai/router/databaseQuestionParser').parseQuestion(text, new Date('2026-10-27T05:00:00Z'))};
      if(name==='./reports/employeeReview') return {employeeReview:async args=>{calls.push(['employeeReview',args]);return {answer:'Employee performance review'};}};
      if(name==='./conversation/databaseFollowup') return require('../../services/bharat-ai/conversation/databaseFollowup');
      if(name==='./context/gradeIdentifier') return require('../../services/bharat-ai/context/gradeIdentifier');
      if(name==='./context/companyNameFilter') return require('../../services/bharat-ai/context/companyNameFilter');
      if(name==='./usage/databaseAudit') return {auditDatabaseQuestion:entry=>audits.push(entry)};
      if(name==='./router/databaseEntities') return require('../../services/bharat-ai/router/databaseEntities');
      if(name==='./router/reportSuggestions') return require('../../services/bharat-ai/router/reportSuggestions');
      if(name==='./router/reportCapabilities') return require('../../services/bharat-ai/router/reportCapabilities');
      if(name==='../employeeLocationService') return {getEmployeeHistory:async(id,query,user)=>{calls.push(['locationHistory',{id,query,user}]);return options.location || {history:[]};}};
      if(name==='./reports/employeeLocationReport') return require('../../services/bharat-ai/reports/employeeLocationReport');
      if(name==='./reports/gradeAnalysis') return require('../../services/bharat-ai/reports/gradeAnalysis');
      if(name==='./reports/queryReport') return require('../../services/bharat-ai/reports/queryReport');
      if(name==='./reports/ledgerReport') return require('../../services/bharat-ai/reports/ledgerReport');
      if (name.includes('modelRegistry')) return {
        Receivable: {aggregate: pipeline=>{calls.push(['ledgerReport',pipeline]);return {option:async()=>[{summary:[{count:1,customers:1,amount:118000,outstanding:118000}],records:[{companyName:'Example Engineering',receiptNumber:'RCPT-1',receiptDate:'2026-10-27',amount:118000,invoiceNumber:'BSS/1042',invoiceAmount:118000,pendingAmount:118000,contactPersonName:'Accounts',contactPersonNumber:'9000000000'}]}]};}},
        User: {find: query => { calls.push(['employees',query]); return chain(query._id ? [{_id:query._id,name:'Own Employee'}] : (options.users || [{_id:'d1',name:'Deepak Arya'},{_id:'d2',name:'Deepak Yadav'}])); }},
        Enquiry: {aggregate:p=>{calls.push(['enquiryRecords',p[0].$match]);return require('./reportModel').reportModel(options.enquiries || []).aggregate(p);}},
        Attendance: {aggregate:p=>{calls.push(['attendanceRecords',p[0].$match]);return {option:async()=>[{records:[{employeeName:'Shalu',attendanceDate:'2026-10-27T00:00:00Z',attendanceStatus:'checked_in',workMode:'office',checkIn:{time:'2026-10-27T04:00:00Z'}}],summary:[{count:1}],groups:[{name:'checked_in',count:1}]}]};},find: query => {calls.push(['attendanceRecords',query]);return chain([{employeeName:'Shalu',attendanceDate:'2026-10-27T00:00:00Z',attendanceStatus:'checked_in',workMode:'office',checkIn:{time:'2026-10-27T04:00:00Z'}}]);}},
        Dispatch: {aggregate:p=>{if(p.some(s=>s.$addFields)){calls.push(['ledgerReport',p]);return {option:async()=>[{summary:[{count:1,customers:1,amount:118000,outstanding:118000,paid:0}],records:[{companyName:'Example Engineering',invoiceNumber:'BSS/1042',invoiceAmount:118000,pendingAmount:118000,amount:118000,contactPersonName:'Accounts',contactPersonNumber:'9000000000'}]}]};}calls.push(['dispatchOrders',p[0].$match]);return {option:async()=>[{records:[],summary:[{count:0,invoiceValue:0,quantity:0,outstanding:0}]}]};},find: query => {calls.push(['dispatchOrders',query]);return chain([]);}},
        SalesOrder: {aggregate: pipeline=>{if(pipeline.some(p=>p.$facet)){calls.push(['orders',pipeline[0].$match]);if(options.orders)return require('./reportModel').reportModel(options.orders).aggregate(pipeline);return {option:async()=>[{records:[],summary:[{count:0,orderValue:0}]}]};}calls.push(['salesAggregate',pipeline]);return Promise.resolve([{totalSales:100,totalOrders:1}]);},find: query => {calls.push(['orders',query]);return {select(){return this;},sort(){return this;},limit(n){this.cap=n;return this;},maxTimeMS(){return this;},async lean(){const r=await require('./reportModel').reportModel(options.orders || []).aggregate([{$match:query},{$limit:this.cap}]).option();return r;}};}},
        OrderTracking: {aggregate:p=>{calls.push(['plan',p[0].$match]);if(options.tracking)return require('./reportModel').reportModel(options.tracking).aggregate(p);return {option:async()=>[{records:[],summary:[{count:0}]}]};},find: query => {calls.push(['plan',query]);return chain([]);}}
      };
      if (name==='../managementOrderAnalyticsService') return {extractSalesOrderItems:require('../../services/managementOrderAnalyticsService').extractSalesOrderItems,getManagementOrderAnalytics: async args=>{calls.push(['managementAnalytics',args]);return {summary:{totalOrders:{orderCount:2,orderKG:1000},house:{orderKG:200},steelMill:{orderKG:800}},dataQuality:{unresolvedOrders:1}};}};
      if (name==='../logisticsAnalyticsService') return {getLogisticsAnalytics: async args=>{calls.push(['logisticsAnalytics',args]);return {summary:{combined:{dispatchPlanKG:1000,actualDispatchKG:400,targetPendingKG:600}}};}};
      if (name.includes('toolHelpers')) return {buildDateRange: (a,b) => options.realDates?{$gte:new Date(`${a}T00:00:00+05:30`),$lte:new Date(`${b}T23:59:59.999+05:30`)}:({from:a,to:b})};
      return new Proxy({}, {get: (_, key) => async args => { calls.push([key,args]); return {totalSales:1234,totalOrders:2,timesheets:[]}; }});
    }
  });
  return {ask: module.exports.askDatabase,calls,audits};
}
module.exports={fixture};

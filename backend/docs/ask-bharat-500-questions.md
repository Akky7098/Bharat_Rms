# Ask Bharat — 500-question regression catalogue

500 unique inputs across 100 independently specified scenarios and five input styles. 410 supported report variations; 90 clarification/decline variations.

Model/tool doubles exercise all 500 inputs under superadmin/admin/user. Tests are not live DB reconciliation. Additional report data tests verify ledger totals and filter composition.

| ID | Question | Expected report / handling | Expected filters |
| --- | --- | --- | --- |
| Q001 | sales today | sales_summary | from=2026-10-27, to=2026-10-27 |
| Q002 | please sales today | sales_summary | from=2026-10-27, to=2026-10-27 |
| Q003 | SALES TODAY | sales_summary | from=2026-10-27, to=2026-10-27 |
| Q004 | could you   sales  today | sales_summary | from=2026-10-27, to=2026-10-27 |
| Q005 | tell me salse tadays | sales_summary | from=2026-10-27, to=2026-10-27 |
| Q006 | revenue yesterday | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q007 | please revenue yesterday | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q008 | REVENUE YESTERDAY | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q009 | could you   revenue  yesterday | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q010 | tell me reveneu yestarday | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q011 | turnover this month | sales_summary | from=2026-10-01, to=2026-10-27 |
| Q012 | please turnover this month | sales_summary | from=2026-10-01, to=2026-10-27 |
| Q013 | TURNOVER THIS MONTH | sales_summary | from=2026-10-01, to=2026-10-27 |
| Q014 | could you   turnover  this  month | sales_summary | from=2026-10-01, to=2026-10-27 |
| Q015 | tell me turnover this mnth | sales_summary | from=2026-10-01, to=2026-10-27 |
| Q016 | revenue last one month | sales_summary | from=2026-09-27, to=2026-10-27 |
| Q017 | please revenue last one month | sales_summary | from=2026-09-27, to=2026-10-27 |
| Q018 | REVENUE LAST ONE MONTH | sales_summary | from=2026-09-27, to=2026-10-27 |
| Q019 | could you   revenue  last  one  month | sales_summary | from=2026-09-27, to=2026-10-27 |
| Q020 | tell me reveneu last one mnth | sales_summary | from=2026-09-27, to=2026-10-27 |
| Q021 | sales last 3 months | sales_summary | from=2026-07-27, to=2026-10-27 |
| Q022 | please sales last 3 months | sales_summary | from=2026-07-27, to=2026-10-27 |
| Q023 | SALES LAST 3 MONTHS | sales_summary | from=2026-07-27, to=2026-10-27 |
| Q024 | could you   sales  last  3  months | sales_summary | from=2026-07-27, to=2026-10-27 |
| Q025 | tell me salse last 3 months | sales_summary | from=2026-07-27, to=2026-10-27 |
| Q026 | sales last month | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q027 | please sales last month | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q028 | SALES LAST MONTH | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q029 | could you   sales  last  month | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q030 | tell me salse last mnth | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q031 | my sales this week | sales_summary | self=True, from=2026-10-26 |
| Q032 | please my sales this week | sales_summary | self=True, from=2026-10-26 |
| Q033 | MY SALES THIS WEEK | sales_summary | self=True, from=2026-10-26 |
| Q034 | could you   my  sales  this  week | sales_summary | self=True, from=2026-10-26 |
| Q035 | tell me my salse this week | sales_summary | self=True, from=2026-10-26 |
| Q036 | sales last week | sales_summary | from=2026-10-19, to=2026-10-25 |
| Q037 | please sales last week | sales_summary | from=2026-10-19, to=2026-10-25 |
| Q038 | SALES LAST WEEK | sales_summary | from=2026-10-19, to=2026-10-25 |
| Q039 | could you   sales  last  week | sales_summary | from=2026-10-19, to=2026-10-25 |
| Q040 | tell me salse last week | sales_summary | from=2026-10-19, to=2026-10-25 |
| Q041 | sales September 2026 | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q042 | please sales September 2026 | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q043 | SALES SEPTEMBER 2026 | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q044 | could you   sales  September  2026 | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q045 | tell me salse September 2026 | sales_summary | from=2026-09-01, to=2026-09-30 |
| Q046 | sales 26 Oct 2026 | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q047 | please sales 26 Oct 2026 | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q048 | SALES 26 OCT 2026 | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q049 | could you   sales  26  Oct  2026 | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q050 | tell me salse 26 Oct 2026 | sales_summary | from=2026-10-26, to=2026-10-26 |
| Q051 | sales 2026-10-01 to 2026-10-20 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q052 | please sales 2026-10-01 to 2026-10-20 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q053 | SALES 2026-10-01 TO 2026-10-20 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q054 | could you   sales  2026-10-01  to  2026-10-20 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q055 | tell me salse 2026-10-01 to 2026-10-20 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q056 | sales 01/10/2026 to 20/10/2026 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q057 | please sales 01/10/2026 to 20/10/2026 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q058 | SALES 01/10/2026 TO 20/10/2026 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q059 | could you   sales  01/10/2026  to  20/10/2026 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q060 | tell me salse 01/10/2026 to 20/10/2026 | sales_summary | from=2026-10-01, to=2026-10-20 |
| Q061 | sales past seven days | sales_summary | from=2026-10-21, to=2026-10-27 |
| Q062 | please sales past seven days | sales_summary | from=2026-10-21, to=2026-10-27 |
| Q063 | SALES PAST SEVEN DAYS | sales_summary | from=2026-10-21, to=2026-10-27 |
| Q064 | could you   sales  past  seven  days | sales_summary | from=2026-10-21, to=2026-10-27 |
| Q065 | tell me salse past seven days | sales_summary | from=2026-10-21, to=2026-10-27 |
| Q066 | Deepak Arya sales this month | sales_summary | from=2026-10-01 |
| Q067 | please Deepak Arya sales this month | sales_summary | from=2026-10-01 |
| Q068 | DEEPAK ARYA SALES THIS MONTH | sales_summary | from=2026-10-01 |
| Q069 | could you   Deepak  Arya  sales  this  month | sales_summary | from=2026-10-01 |
| Q070 | tell me Deepak Arya salse this mnth | sales_summary | from=2026-10-01 |
| Q071 | aaj sales kitna hai | sales_summary | from=2026-10-27 |
| Q072 | please aaj sales kitna hai | sales_summary | from=2026-10-27 |
| Q073 | AAJ SALES KITNA HAI | sales_summary | from=2026-10-27 |
| Q074 | could you   aaj  sales  kitna  hai | sales_summary | from=2026-10-27 |
| Q075 | tell me aaj salse kitna hai | sales_summary | from=2026-10-27 |
| Q076 | pending sales orders this month | sales_orders | status=pending |
| Q077 | please pending sales orders this month | sales_orders | status=pending |
| Q078 | PENDING SALES ORDERS THIS MONTH | sales_orders | status=pending |
| Q079 | could you   pending  sales  orders  this  month | sales_orders | status=pending |
| Q080 | tell me pendng salse ordres this mnth | sales_orders | status=pending |
| Q081 | list rejected orders last week | sales_orders | status=rejected |
| Q082 | please list rejected orders last week | sales_orders | status=rejected |
| Q083 | LIST REJECTED ORDERS LAST WEEK | sales_orders | status=rejected |
| Q084 | could you   list  rejected  orders  last  week | sales_orders | status=rejected |
| Q085 | tell me list rejcted ordres last week | sales_orders | status=rejected |
| Q086 | approved order details today | sales_orders | status=approved |
| Q087 | please approved order details today | sales_orders | status=approved |
| Q088 | APPROVED ORDER DETAILS TODAY | sales_orders | status=approved |
| Q089 | could you   approved  order  details  today | sales_orders | status=approved |
| Q090 | tell me aproved ordar detials tadays | sales_orders | status=approved |
| Q091 | order detail from Faridabad this month | sales_orders | location=faridabad |
| Q092 | please order detail from Faridabad this month | sales_orders | location=faridabad |
| Q093 | ORDER DETAIL FROM FARIDABAD THIS MONTH | sales_orders | location=faridabad |
| Q094 | could you   order  detail  from  Faridabad  this  month | sales_orders | location=faridabad |
| Q095 | tell me ordar deatil from Faridabad this mnth | sales_orders | location=faridabad |
| Q096 | order details from New Delhi last month | sales_orders | location=new delhi |
| Q097 | please order details from New Delhi last month | sales_orders | location=new delhi |
| Q098 | ORDER DETAILS FROM NEW DELHI LAST MONTH | sales_orders | location=new delhi |
| Q099 | could you   order  details  from  New  Delhi  last  month | sales_orders | location=new delhi |
| Q100 | tell me ordar detials from New Delhi last mnth | sales_orders | location=new delhi |
| Q101 | Kesari Alloy orders | sales_orders | mill=Kesari Alloys - Bhiwadi, allTime=True |
| Q102 | please Kesari Alloy orders | sales_orders | mill=Kesari Alloys - Bhiwadi, allTime=True |
| Q103 | KESARI ALLOY ORDERS | sales_orders | mill=Kesari Alloys - Bhiwadi, allTime=True |
| Q104 | could you   Kesari  Alloy  orders | sales_orders | mill=Kesari Alloys - Bhiwadi, allTime=True |
| Q105 | tell me keshari Alloy ordres | sales_orders | mill=Kesari Alloys - Bhiwadi, allTime=True |
| Q106 | Keshari Alloys orders this month | sales_orders | mill=Kesari Alloys - Bhiwadi |
| Q107 | please Keshari Alloys orders this month | sales_orders | mill=Kesari Alloys - Bhiwadi |
| Q108 | KESHARI ALLOYS ORDERS THIS MONTH | sales_orders | mill=Kesari Alloys - Bhiwadi |
| Q109 | could you   Keshari  Alloys  orders  this  month | sales_orders | mill=Kesari Alloys - Bhiwadi |
| Q110 | tell me Keshari Alloys ordres this mnth | sales_orders | mill=Kesari Alloys - Bhiwadi |
| Q111 | order in Keshri Alloy mill last 3 month | sales_orders | mill=Kesari Alloys - Bhiwadi, from=2026-07-27 |
| Q112 | please order in Keshri Alloy mill last 3 month | sales_orders | mill=Kesari Alloys - Bhiwadi, from=2026-07-27 |
| Q113 | ORDER IN KESHRI ALLOY MILL LAST 3 MONTH | sales_orders | mill=Kesari Alloys - Bhiwadi, from=2026-07-27 |
| Q114 | could you   order  in  Keshri  Alloy  mill  last  3  month | sales_orders | mill=Kesari Alloys - Bhiwadi, from=2026-07-27 |
| Q115 | tell me ordar in Keshri Alloy mill last 3 mnth | sales_orders | mill=Kesari Alloys - Bhiwadi, from=2026-07-27 |
| Q116 | AV Alloy order details last 3 months | sales_orders | mill=AV Alloys - Mandi Gobindgarh |
| Q117 | please AV Alloy order details last 3 months | sales_orders | mill=AV Alloys - Mandi Gobindgarh |
| Q118 | AV ALLOY ORDER DETAILS LAST 3 MONTHS | sales_orders | mill=AV Alloys - Mandi Gobindgarh |
| Q119 | could you   AV  Alloy  order  details  last  3  months | sales_orders | mill=AV Alloys - Mandi Gobindgarh |
| Q120 | tell me AV Alloy ordar detials last 3 months | sales_orders | mill=AV Alloys - Mandi Gobindgarh |
| Q121 | Punjab General orders this month | sales_orders | mill=Punjab General |
| Q122 | please Punjab General orders this month | sales_orders | mill=Punjab General |
| Q123 | PUNJAB GENERAL ORDERS THIS MONTH | sales_orders | mill=Punjab General |
| Q124 | could you   Punjab  General  orders  this  month | sales_orders | mill=Punjab General |
| Q125 | tell me Punjab General ordres this mnth | sales_orders | mill=Punjab General |
| Q126 | Polystud orders last month | sales_orders | mill=Polystud Lifting |
| Q127 | please Polystud orders last month | sales_orders | mill=Polystud Lifting |
| Q128 | POLYSTUD ORDERS LAST MONTH | sales_orders | mill=Polystud Lifting |
| Q129 | could you   Polystud  orders  last  month | sales_orders | mill=Polystud Lifting |
| Q130 | tell me Polystud ordres last mnth | sales_orders | mill=Polystud Lifting |
| Q131 | Jassar orders this week | sales_orders | mill=Jassar Forging |
| Q132 | please Jassar orders this week | sales_orders | mill=Jassar Forging |
| Q133 | JASSAR ORDERS THIS WEEK | sales_orders | mill=Jassar Forging |
| Q134 | could you   Jassar  orders  this  week | sales_orders | mill=Jassar Forging |
| Q135 | tell me Jassar ordres this week | sales_orders | mill=Jassar Forging |
| Q136 | SS Steel orders today | sales_orders | mill=S.S. Steel - Sirhind |
| Q137 | please SS Steel orders today | sales_orders | mill=S.S. Steel - Sirhind |
| Q138 | SS STEEL ORDERS TODAY | sales_orders | mill=S.S. Steel - Sirhind |
| Q139 | could you   SS  Steel  orders  today | sales_orders | mill=S.S. Steel - Sirhind |
| Q140 | tell me SS Steel ordres tadays | sales_orders | mill=S.S. Steel - Sirhind |
| Q141 | Skyway orders this year | sales_orders | mill=Skyway - Ludhiana |
| Q142 | please Skyway orders this year | sales_orders | mill=Skyway - Ludhiana |
| Q143 | SKYWAY ORDERS THIS YEAR | sales_orders | mill=Skyway - Ludhiana |
| Q144 | could you   Skyway  orders  this  year | sales_orders | mill=Skyway - Ludhiana |
| Q145 | tell me Skyway ordres this year | sales_orders | mill=Skyway - Ludhiana |
| Q146 | Kuber Concast orders this month | sales_orders | mill=Kuber Concast - Mandi Gobindgarh |
| Q147 | please Kuber Concast orders this month | sales_orders | mill=Kuber Concast - Mandi Gobindgarh |
| Q148 | KUBER CONCAST ORDERS THIS MONTH | sales_orders | mill=Kuber Concast - Mandi Gobindgarh |
| Q149 | could you   Kuber  Concast  orders  this  month | sales_orders | mill=Kuber Concast - Mandi Gobindgarh |
| Q150 | tell me Kuber Concast ordres this mnth | sales_orders | mill=Kuber Concast - Mandi Gobindgarh |
| Q151 | Pushpanjali orders last month | sales_orders | mill=Pushpanjali Strip |
| Q152 | please Pushpanjali orders last month | sales_orders | mill=Pushpanjali Strip |
| Q153 | PUSHPANJALI ORDERS LAST MONTH | sales_orders | mill=Pushpanjali Strip |
| Q154 | could you   Pushpanjali  orders  last  month | sales_orders | mill=Pushpanjali Strip |
| Q155 | tell me Pushpanjali ordres last mnth | sales_orders | mill=Pushpanjali Strip |
| Q156 | Shakti Rolling orders this month | sales_orders | mill=Shakti Rolling - Mandi Gobindgarh |
| Q157 | please Shakti Rolling orders this month | sales_orders | mill=Shakti Rolling - Mandi Gobindgarh |
| Q158 | SHAKTI ROLLING ORDERS THIS MONTH | sales_orders | mill=Shakti Rolling - Mandi Gobindgarh |
| Q159 | could you   Shakti  Rolling  orders  this  month | sales_orders | mill=Shakti Rolling - Mandi Gobindgarh |
| Q160 | tell me Shakti Rolling ordres this mnth | sales_orders | mill=Shakti Rolling - Mandi Gobindgarh |
| Q161 | East India orders this month | sales_orders | mill=East India - Durgapur |
| Q162 | please East India orders this month | sales_orders | mill=East India - Durgapur |
| Q163 | EAST INDIA ORDERS THIS MONTH | sales_orders | mill=East India - Durgapur |
| Q164 | could you   East  India  orders  this  month | sales_orders | mill=East India - Durgapur |
| Q165 | tell me East India ordres this mnth | sales_orders | mill=East India - Durgapur |
| Q166 | Behari Lal orders this month | sales_orders | mill=Behari Lal - Mandi Gobindgarh |
| Q167 | please Behari Lal orders this month | sales_orders | mill=Behari Lal - Mandi Gobindgarh |
| Q168 | BEHARI LAL ORDERS THIS MONTH | sales_orders | mill=Behari Lal - Mandi Gobindgarh |
| Q169 | could you   Behari  Lal  orders  this  month | sales_orders | mill=Behari Lal - Mandi Gobindgarh |
| Q170 | tell me Behari Lal ordres this mnth | sales_orders | mill=Behari Lal - Mandi Gobindgarh |
| Q171 | Kesari Alloys EN353 orders this month | sales_orders | mill=Kesari Alloys - Bhiwadi, grade=EN353 |
| Q172 | please Kesari Alloys EN353 orders this month | sales_orders | mill=Kesari Alloys - Bhiwadi, grade=EN353 |
| Q173 | KESARI ALLOYS EN353 ORDERS THIS MONTH | sales_orders | mill=Kesari Alloys - Bhiwadi, grade=EN353 |
| Q174 | could you   Kesari  Alloys  EN353  orders  this  month | sales_orders | mill=Kesari Alloys - Bhiwadi, grade=EN353 |
| Q175 | tell me keshari Alloys EN353 ordres this mnth | sales_orders | mill=Kesari Alloys - Bhiwadi, grade=EN353 |
| Q176 | EN19 orders this month | sales_orders | grade=EN19 |
| Q177 | please EN19 orders this month | sales_orders | grade=EN19 |
| Q178 | EN19 ORDERS THIS MONTH | sales_orders | grade=EN19 |
| Q179 | could you   EN19  orders  this  month | sales_orders | grade=EN19 |
| Q180 | tell me EN19 ordres this mnth | sales_orders | grade=EN19 |
| Q181 | H13 order details last month | sales_orders | grade=H13 |
| Q182 | please H13 order details last month | sales_orders | grade=H13 |
| Q183 | H13 ORDER DETAILS LAST MONTH | sales_orders | grade=H13 |
| Q184 | could you   H13  order  details  last  month | sales_orders | grade=H13 |
| Q185 | tell me H13 ordar detials last mnth | sales_orders | grade=H13 |
| Q186 | orders for company "Example Engineering" this month | sales_orders | company=example engineering |
| Q187 | please orders for company "Example Engineering" this month | sales_orders | company=example engineering |
| Q188 | ORDERS FOR COMPANY "EXAMPLE ENGINEERING" THIS MONTH | sales_orders | company=example engineering |
| Q189 | could you   orders  for  company  "Example  Engineering"  this  month | sales_orders | company=example engineering |
| Q190 | tell me ordres for company "Example Engineering" this mnth | sales_orders | company=example engineering |
| Q191 | Kesari Alloys order details from Faridabad this month | sales_orders | mill=Kesari Alloys - Bhiwadi, location=faridabad |
| Q192 | please Kesari Alloys order details from Faridabad this month | sales_orders | mill=Kesari Alloys - Bhiwadi, location=faridabad |
| Q193 | KESARI ALLOYS ORDER DETAILS FROM FARIDABAD THIS MONTH | sales_orders | mill=Kesari Alloys - Bhiwadi, location=faridabad |
| Q194 | could you   Kesari  Alloys  order  details  from  Faridabad  this  month | sales_orders | mill=Kesari Alloys - Bhiwadi, location=faridabad |
| Q195 | tell me keshari Alloys ordar detials from Faridabad this mnth | sales_orders | mill=Kesari Alloys - Bhiwadi, location=faridabad |
| Q196 | Kesari Alloys total sales this month | sales_summary | mill=Kesari Alloys - Bhiwadi |
| Q197 | please Kesari Alloys total sales this month | sales_summary | mill=Kesari Alloys - Bhiwadi |
| Q198 | KESARI ALLOYS TOTAL SALES THIS MONTH | sales_summary | mill=Kesari Alloys - Bhiwadi |
| Q199 | could you   Kesari  Alloys  total  sales  this  month | sales_summary | mill=Kesari Alloys - Bhiwadi |
| Q200 | tell me keshari Alloys total salse this mnth | sales_summary | mill=Kesari Alloys - Bhiwadi |
| Q201 | top 5 customers this month | top_customers | limit=5 |
| Q202 | please top 5 customers this month | top_customers | limit=5 |
| Q203 | TOP 5 CUSTOMERS THIS MONTH | top_customers | limit=5 |
| Q204 | could you   top  5  customers  this  month | top_customers | limit=5 |
| Q205 | tell me top 5 customers this mnth | top_customers | limit=5 |
| Q206 | best customers this year | top_customers |  |
| Q207 | please best customers this year | top_customers |  |
| Q208 | BEST CUSTOMERS THIS YEAR | top_customers |  |
| Q209 | could you   best  customers  this  year | top_customers |  |
| Q210 | tell me best customers this year | top_customers |  |
| Q211 | top 10 customers last month | top_customers | limit=10 |
| Q212 | please top 10 customers last month | top_customers | limit=10 |
| Q213 | TOP 10 CUSTOMERS LAST MONTH | top_customers | limit=10 |
| Q214 | could you   top  10  customers  last  month | top_customers | limit=10 |
| Q215 | tell me top 10 customers last mnth | top_customers | limit=10 |
| Q216 | attendance today | attendance |  |
| Q217 | please attendance today | attendance |  |
| Q218 | ATTENDANCE TODAY | attendance |  |
| Q219 | could you   attendance  today | attendance |  |
| Q220 | tell me attandance tadays | attendance |  |
| Q221 | all persons today attendance check in time | attendance |  |
| Q222 | please all persons today attendance check in time | attendance |  |
| Q223 | ALL PERSONS TODAY ATTENDANCE CHECK IN TIME | attendance |  |
| Q224 | could you   all  persons  today  attendance  check  in  time | attendance |  |
| Q225 | tell me all persons tadays attandance check in time | attendance |  |
| Q226 | everyone check out time today | attendance |  |
| Q227 | please everyone check out time today | attendance |  |
| Q228 | EVERYONE CHECK OUT TIME TODAY | attendance |  |
| Q229 | could you   everyone  check  out  time  today | attendance |  |
| Q230 | tell me everyone check out time tadays | attendance |  |
| Q231 | who is present today | attendance | attendanceStatus=present |
| Q232 | please who is present today | attendance | attendanceStatus=present |
| Q233 | WHO IS PRESENT TODAY | attendance | attendanceStatus=present |
| Q234 | could you   who  is  present  today | attendance | attendanceStatus=present |
| Q235 | tell me who is present tadays | attendance | attendanceStatus=present |
| Q236 | who is absent today | attendance | attendanceStatus=absent |
| Q237 | please who is absent today | attendance | attendanceStatus=absent |
| Q238 | WHO IS ABSENT TODAY | attendance | attendanceStatus=absent |
| Q239 | could you   who  is  absent  today | attendance | attendanceStatus=absent |
| Q240 | tell me who is absent tadays | attendance | attendanceStatus=absent |
| Q241 | who is on leave today | attendance | attendanceStatus=on_leave |
| Q242 | please who is on leave today | attendance | attendanceStatus=on_leave |
| Q243 | WHO IS ON LEAVE TODAY | attendance | attendanceStatus=on_leave |
| Q244 | could you   who  is  on  leave  today | attendance | attendanceStatus=on_leave |
| Q245 | tell me who is on leave tadays | attendance | attendanceStatus=on_leave |
| Q246 | my attendance yesterday | attendance | self=True |
| Q247 | please my attendance yesterday | attendance | self=True |
| Q248 | MY ATTENDANCE YESTERDAY | attendance | self=True |
| Q249 | could you   my  attendance  yesterday | attendance | self=True |
| Q250 | tell me my attandance yestarday | attendance | self=True |
| Q251 | Deepak Arya attendance today | attendance |  |
| Q252 | please Deepak Arya attendance today | attendance |  |
| Q253 | DEEPAK ARYA ATTENDANCE TODAY | attendance |  |
| Q254 | could you   Deepak  Arya  attendance  today | attendance |  |
| Q255 | tell me Deepak Arya attandance tadays | attendance |  |
| Q256 | attendance last week | attendance |  |
| Q257 | please attendance last week | attendance |  |
| Q258 | ATTENDANCE LAST WEEK | attendance |  |
| Q259 | could you   attendance  last  week | attendance |  |
| Q260 | tell me attandance last week | attendance |  |
| Q261 | show employees checked out today | attendance | attendanceStatus=checked_out |
| Q262 | please show employees checked out today | attendance | attendanceStatus=checked_out |
| Q263 | SHOW EMPLOYEES CHECKED OUT TODAY | attendance | attendanceStatus=checked_out |
| Q264 | could you   show  employees  checked  out  today | attendance | attendanceStatus=checked_out |
| Q265 | tell me show emplyees checked out tadays | attendance | attendanceStatus=checked_out |
| Q266 | my timesheet today | timesheets | self=True |
| Q267 | please my timesheet today | timesheets | self=True |
| Q268 | MY TIMESHEET TODAY | timesheets | self=True |
| Q269 | could you   my  timesheet  today | timesheets | self=True |
| Q270 | tell me my timeshet tadays | timesheets | self=True |
| Q271 | Deepak Arya timesheet yesterday | timesheets |  |
| Q272 | please Deepak Arya timesheet yesterday | timesheets |  |
| Q273 | DEEPAK ARYA TIMESHEET YESTERDAY | timesheets |  |
| Q274 | could you   Deepak  Arya  timesheet  yesterday | timesheets |  |
| Q275 | tell me Deepak Arya timeshet yestarday | timesheets |  |
| Q276 | Deepak Yadav work report last week | timesheets |  |
| Q277 | please Deepak Yadav work report last week | timesheets |  |
| Q278 | DEEPAK YADAV WORK REPORT LAST WEEK | timesheets |  |
| Q279 | could you   Deepak  Yadav  work  report  last  week | timesheets |  |
| Q280 | tell me Deepak Yadav work report last week | timesheets |  |
| Q281 | my time sheet this month | timesheets | self=True |
| Q282 | please my time sheet this month | timesheets | self=True |
| Q283 | MY TIME SHEET THIS MONTH | timesheets | self=True |
| Q284 | could you   my  time  sheet  this  month | timesheets | self=True |
| Q285 | tell me my time sheet this mnth | timesheets | self=True |
| Q286 | mera timesheet aaj | timesheets | self=True |
| Q287 | please mera timesheet aaj | timesheets | self=True |
| Q288 | MERA TIMESHEET AAJ | timesheets | self=True |
| Q289 | could you   mera  timesheet  aaj | timesheets | self=True |
| Q290 | tell me mera timeshet aaj | timesheets | self=True |
| Q291 | dispatch summary today | dispatch_summary |  |
| Q292 | please dispatch summary today | dispatch_summary |  |
| Q293 | DISPATCH SUMMARY TODAY | dispatch_summary |  |
| Q294 | could you   dispatch  summary  today | dispatch_summary |  |
| Q295 | tell me disptach summary tadays | dispatch_summary |  |
| Q296 | dispatch last month | dispatch_summary |  |
| Q297 | please dispatch last month | dispatch_summary |  |
| Q298 | DISPATCH LAST MONTH | dispatch_summary |  |
| Q299 | could you   dispatch  last  month | dispatch_summary |  |
| Q300 | tell me disptach last mnth | dispatch_summary |  |
| Q301 | my dispatch summary this week | dispatch_summary | self=True |
| Q302 | please my dispatch summary this week | dispatch_summary | self=True |
| Q303 | MY DISPATCH SUMMARY THIS WEEK | dispatch_summary | self=True |
| Q304 | could you   my  dispatch  summary  this  week | dispatch_summary | self=True |
| Q305 | tell me my disptach summary this week | dispatch_summary | self=True |
| Q306 | dispatch plan tomorrow | dispatch_plan | from=2026-10-28 |
| Q307 | please dispatch plan tomorrow | dispatch_plan | from=2026-10-28 |
| Q308 | DISPATCH PLAN TOMORROW | dispatch_plan | from=2026-10-28 |
| Q309 | could you   dispatch  plan  tomorrow | dispatch_plan | from=2026-10-28 |
| Q310 | tell me disptach plan tommorow | dispatch_plan | from=2026-10-28 |
| Q311 | upcoming shipments this week | dispatch_plan |  |
| Q312 | please upcoming shipments this week | dispatch_plan |  |
| Q313 | UPCOMING SHIPMENTS THIS WEEK | dispatch_plan |  |
| Q314 | could you   upcoming  shipments  this  week | dispatch_plan |  |
| Q315 | tell me upcoming shipments this week | dispatch_plan |  |
| Q316 | shipping schedule today | dispatch_plan |  |
| Q317 | please shipping schedule today | dispatch_plan |  |
| Q318 | SHIPPING SCHEDULE TODAY | dispatch_plan |  |
| Q319 | could you   shipping  schedule  today | dispatch_plan |  |
| Q320 | tell me shipping schedule tadays | dispatch_plan |  |
| Q321 | list delivered dispatches this month | dispatch_orders |  |
| Q322 | please list delivered dispatches this month | dispatch_orders |  |
| Q323 | LIST DELIVERED DISPATCHES THIS MONTH | dispatch_orders |  |
| Q324 | could you   list  delivered  dispatches  this  month | dispatch_orders |  |
| Q325 | tell me list deliverd dispatches this mnth | dispatch_orders |  |
| Q326 | partial dispatch details last month | dispatch_orders |  |
| Q327 | please partial dispatch details last month | dispatch_orders |  |
| Q328 | PARTIAL DISPATCH DETAILS LAST MONTH | dispatch_orders |  |
| Q329 | could you   partial  dispatch  details  last  month | dispatch_orders |  |
| Q330 | tell me partial disptach detials last mnth | dispatch_orders |  |
| Q331 | paid dispatch details this month | dispatch_orders |  |
| Q332 | please paid dispatch details this month | dispatch_orders |  |
| Q333 | PAID DISPATCH DETAILS THIS MONTH | dispatch_orders |  |
| Q334 | could you   paid  dispatch  details  this  month | dispatch_orders |  |
| Q335 | tell me paid disptach detials this mnth | dispatch_orders |  |
| Q336 | cancelled dispatch details this month | dispatch_orders |  |
| Q337 | please cancelled dispatch details this month | dispatch_orders |  |
| Q338 | CANCELLED DISPATCH DETAILS THIS MONTH | dispatch_orders |  |
| Q339 | could you   cancelled  dispatch  details  this  month | dispatch_orders |  |
| Q340 | tell me cancelled disptach detials this mnth | dispatch_orders |  |
| Q341 | order tracking | tracking_orders |  |
| Q342 | please order tracking | tracking_orders |  |
| Q343 | ORDER TRACKING | tracking_orders |  |
| Q344 | could you   order  tracking | tracking_orders |  |
| Q345 | tell me ordar trackng | tracking_orders |  |
| Q346 | orders on hold | tracking_orders |  |
| Q347 | please orders on hold | tracking_orders |  |
| Q348 | ORDERS ON HOLD | tracking_orders |  |
| Q349 | could you   orders  on  hold | tracking_orders |  |
| Q350 | tell me ordres on hold | tracking_orders |  |
| Q351 | which orders are delayed | delayed_orders |  |
| Q352 | please which orders are delayed | delayed_orders |  |
| Q353 | WHICH ORDERS ARE DELAYED | delayed_orders |  |
| Q354 | could you   which  orders  are  delayed | delayed_orders |  |
| Q355 | tell me which ordres are delayed | delayed_orders |  |
| Q356 | overdue payments | receivables |  |
| Q357 | please overdue payments | receivables |  |
| Q358 | OVERDUE PAYMENTS | receivables |  |
| Q359 | could you   overdue  payments | receivables |  |
| Q360 | tell me overdu paymnt | receivables |  |
| Q361 | outstanding dues | receivables |  |
| Q362 | please outstanding dues | receivables |  |
| Q363 | OUTSTANDING DUES | receivables |  |
| Q364 | could you   outstanding  dues | receivables |  |
| Q365 | tell me outstandng dues | receivables |  |
| Q366 | my receivables | receivables | self=True |
| Q367 | please my receivables | receivables | self=True |
| Q368 | MY RECEIVABLES | receivables | self=True |
| Q369 | could you   my  receivables | receivables | self=True |
| Q370 | tell me my receivables | receivables | self=True |
| Q371 | enquiries this month | enquiries |  |
| Q372 | please enquiries this month | enquiries |  |
| Q373 | ENQUIRIES THIS MONTH | enquiries |  |
| Q374 | could you   enquiries  this  month | enquiries |  |
| Q375 | tell me enqury this mnth | enquiries |  |
| Q376 | inquiries last week | enquiries |  |
| Q377 | please inquiries last week | enquiries |  |
| Q378 | INQUIRIES LAST WEEK | enquiries |  |
| Q379 | could you   inquiries  last  week | enquiries |  |
| Q380 | tell me inquiries last week | enquiries |  |
| Q381 | cold calls yesterday | activity |  |
| Q382 | please cold calls yesterday | activity |  |
| Q383 | COLD CALLS YESTERDAY | activity |  |
| Q384 | could you   cold  calls  yesterday | activity |  |
| Q385 | tell me cold calls yestarday | activity |  |
| Q386 | visits today | activity |  |
| Q387 | please visits today | activity |  |
| Q388 | VISITS TODAY | activity |  |
| Q389 | could you   visits  today | activity |  |
| Q390 | tell me visits tadays | activity |  |
| Q391 | management analysis this month | management_analysis |  |
| Q392 | please management analysis this month | management_analysis |  |
| Q393 | MANAGEMENT ANALYSIS THIS MONTH | management_analysis |  |
| Q394 | could you   management  analysis  this  month | management_analysis |  |
| Q395 | tell me managment analisis this mnth | management_analysis |  |
| Q396 | logistics analysis last month | logistics_analysis |  |
| Q397 | please logistics analysis last month | logistics_analysis |  |
| Q398 | LOGISTICS ANALYSIS LAST MONTH | logistics_analysis |  |
| Q399 | could you   logistics  analysis  last  month | logistics_analysis |  |
| Q400 | tell me logisitcs analisis last mnth | logistics_analysis |  |
| Q401 | executive overview this month | executive_summary |  |
| Q402 | please executive overview this month | executive_summary |  |
| Q403 | EXECUTIVE OVERVIEW THIS MONTH | executive_summary |  |
| Q404 | could you   executive  overview  this  month | executive_summary |  |
| Q405 | tell me executive overview this mnth | executive_summary |  |
| Q406 | sales kal | Clarify / decline |  |
| Q407 | please sales kal | Clarify / decline |  |
| Q408 | SALES KAL | Clarify / decline |  |
| Q409 | could you   sales  kal | Clarify / decline |  |
| Q410 | tell me salse kal | Clarify / decline |  |
| Q411 | sales 2026-02-30 | Clarify / decline |  |
| Q412 | please sales 2026-02-30 | Clarify / decline |  |
| Q413 | SALES 2026-02-30 | Clarify / decline |  |
| Q414 | could you   sales  2026-02-30 | Clarify / decline |  |
| Q415 | tell me salse 2026-02-30 | Clarify / decline |  |
| Q416 | sales 31 Feb 2026 | Clarify / decline |  |
| Q417 | please sales 31 Feb 2026 | Clarify / decline |  |
| Q418 | SALES 31 FEB 2026 | Clarify / decline |  |
| Q419 | could you   sales  31  Feb  2026 | Clarify / decline |  |
| Q420 | tell me salse 31 Feb 2026 | Clarify / decline |  |
| Q421 | sales 2026-10-27 to 2026-10-01 | Clarify / decline |  |
| Q422 | please sales 2026-10-27 to 2026-10-01 | Clarify / decline |  |
| Q423 | SALES 2026-10-27 TO 2026-10-01 | Clarify / decline |  |
| Q424 | could you   sales  2026-10-27  to  2026-10-01 | Clarify / decline |  |
| Q425 | tell me salse 2026-10-27 to 2026-10-01 | Clarify / decline |  |
| Q426 | orders in imaginary mill | Clarify / decline |  |
| Q427 | please orders in imaginary mill | Clarify / decline |  |
| Q428 | ORDERS IN IMAGINARY MILL | Clarify / decline |  |
| Q429 | could you   orders  in  imaginary  mill | Clarify / decline |  |
| Q430 | tell me ordres in imaginary mill | Clarify / decline |  |
| Q431 | Kesari Alloys and AV Alloys orders | Clarify / decline |  |
| Q432 | please Kesari Alloys and AV Alloys orders | Clarify / decline |  |
| Q433 | KESARI ALLOYS AND AV ALLOYS ORDERS | Clarify / decline |  |
| Q434 | could you   Kesari  Alloys  and  AV  Alloys  orders | Clarify / decline |  |
| Q435 | tell me keshari Alloys and AV Alloys ordres | Clarify / decline |  |
| Q436 | sales profit this month | Clarify / decline |  |
| Q437 | please sales profit this month | Clarify / decline |  |
| Q438 | SALES PROFIT THIS MONTH | Clarify / decline |  |
| Q439 | could you   sales  profit  this  month | Clarify / decline |  |
| Q440 | tell me salse profit this mnth | Clarify / decline |  |
| Q441 | sales above 1 lakh this month | Clarify / decline |  |
| Q442 | please sales above 1 lakh this month | Clarify / decline |  |
| Q443 | SALES ABOVE 1 LAKH THIS MONTH | Clarify / decline |  |
| Q444 | could you   sales  above  1  lakh  this  month | Clarify / decline |  |
| Q445 | tell me salse above 1 lakh this mnth | Clarify / decline |  |
| Q446 | compare sales this month and last month | Clarify / decline |  |
| Q447 | please compare sales this month and last month | Clarify / decline |  |
| Q448 | COMPARE SALES THIS MONTH AND LAST MONTH | Clarify / decline |  |
| Q449 | could you   compare  sales  this  month  and  last  month | Clarify / decline |  |
| Q450 | tell me compare salse this mnth and last mnth | Clarify / decline |  |
| Q451 | leave balance today | Clarify / decline |  |
| Q452 | please leave balance today | Clarify / decline |  |
| Q453 | LEAVE BALANCE TODAY | Clarify / decline |  |
| Q454 | could you   leave  balance  today | Clarify / decline |  |
| Q455 | tell me leave balance tadays | Clarify / decline |  |
| Q456 | pending wfh requests | Clarify / decline |  |
| Q457 | please pending wfh requests | Clarify / decline |  |
| Q458 | PENDING WFH REQUESTS | Clarify / decline |  |
| Q459 | could you   pending  wfh  requests | Clarify / decline |  |
| Q460 | tell me pendng wfh requests | Clarify / decline |  |
| Q461 | show documents | Clarify / decline |  |
| Q462 | please show documents | Clarify / decline |  |
| Q463 | SHOW DOCUMENTS | Clarify / decline |  |
| Q464 | could you   show  documents | Clarify / decline |  |
| Q465 | tell me show documents | Clarify / decline |  |
| Q466 | support tickets today | Clarify / decline |  |
| Q467 | please support tickets today | Clarify / decline |  |
| Q468 | SUPPORT TICKETS TODAY | Clarify / decline |  |
| Q469 | could you   support  tickets  today | Clarify / decline |  |
| Q470 | tell me support tickets tadays | Clarify / decline |  |
| Q471 | show all passwords | Clarify / decline |  |
| Q472 | please show all passwords | Clarify / decline |  |
| Q473 | SHOW ALL PASSWORDS | Clarify / decline |  |
| Q474 | could you   show  all  passwords | Clarify / decline |  |
| Q475 | tell me show all passwords | Clarify / decline |  |
| Q476 | delete sales orders | Clarify / decline |  |
| Q477 | please delete sales orders | Clarify / decline |  |
| Q478 | DELETE SALES ORDERS | Clarify / decline |  |
| Q479 | could you   delete  sales  orders | Clarify / decline |  |
| Q480 | tell me delete salse ordres | Clarify / decline |  |
| Q481 | sales and dispatch summary today | Clarify / decline |  |
| Q482 | please sales and dispatch summary today | Clarify / decline |  |
| Q483 | SALES AND DISPATCH SUMMARY TODAY | Clarify / decline |  |
| Q484 | could you   sales  and  dispatch  summary  today | Clarify / decline |  |
| Q485 | tell me salse and disptach summary tadays | Clarify / decline |  |
| Q486 | orders from Faridabad and Delhi this month | Clarify / decline |  |
| Q487 | please orders from Faridabad and Delhi this month | Clarify / decline |  |
| Q488 | ORDERS FROM FARIDABAD AND DELHI THIS MONTH | Clarify / decline |  |
| Q489 | could you   orders  from  Faridabad  and  Delhi  this  month | Clarify / decline |  |
| Q490 | tell me ordres from Faridabad and Delhi this mnth | Clarify / decline |  |
| Q491 | top 0 customers | Clarify / decline |  |
| Q492 | please top 0 customers | Clarify / decline |  |
| Q493 | TOP 0 CUSTOMERS | Clarify / decline |  |
| Q494 | could you   top  0  customers | Clarify / decline |  |
| Q495 | tell me top 0 customers | Clarify / decline |  |
| Q496 | payments received today | receivables | ledger=receipts |
| Q497 | please payments received today | receivables | ledger=receipts |
| Q498 | PAYMENTS RECEIVED TODAY | receivables | ledger=receipts |
| Q499 | could you   payments  received  today | receivables | ledger=receipts |
| Q500 | tell me paymnt received tadays | receivables | ledger=receipts |

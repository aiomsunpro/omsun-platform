
-- =====================================================================
-- OMSUN Platform — Yojana eligibility: first profile questions and
-- Maharashtra scheme drafts
-- 2026-10-21. Builds on the two earlier Yojana migrations.
--
-- * The profile questions go live straight away (the owner can reword
--   them from /admin). Marathi text is drafted by Claude and must be
--   reviewed by the OMSUN team.
-- * The schemes go in as DRAFTS only. Their rules come from public
--   summaries checked on 21 Oct 2026 and are NOT verified against the
--   latest GR. A manager checks each one against its GR, links the paid
--   service, and submits it; it is live only after the owner approves.
-- =====================================================================

insert into public.profile_fields (key, scope, kind, block, sort_order, label_en, label_mr, label_hi, options) values
-- 1. Basic identity
('age', 'member', 'number', 1, 1, 'Age in years', 'वय (वर्षे)', 'उम्र (वर्ष)', '[]'),
('gender', 'member', 'choice', 1, 2, 'Gender', 'लिंग', 'लिंग',
 '[{"value":"female","en":"Female","mr":"स्त्री","hi":"महिला"},
   {"value":"male","en":"Male","mr":"पुरुष","hi":"पुरुष"},
   {"value":"transgender","en":"Transgender","mr":"तृतीयपंथी","hi":"ट्रांसजेंडर"}]'),
('area_type', 'household', 'choice', 1, 3, 'Village or town', 'गाव की शहर', 'गांव या शहर',
 '[{"value":"rural","en":"Village (rural)","mr":"गाव (ग्रामीण)","hi":"गांव (ग्रामीण)"},
   {"value":"urban","en":"Town / city (urban)","mr":"शहर (नागरी)","hi":"शहर (शहरी)"}]'),
('domicile_mh', 'household', 'choice', 1, 4, 'Lives in Maharashtra', 'महाराष्ट्राचे रहिवासी', 'महाराष्ट्र के निवासी',
 '[{"value":"certificate","en":"Yes, has domicile certificate","mr":"होय, अधिवास प्रमाणपत्र आहे","hi":"हाँ, अधिवास प्रमाणपत्र है"},
   {"value":"no_certificate","en":"Yes, no certificate yet","mr":"होय, प्रमाणपत्र नाही","hi":"हाँ, प्रमाणपत्र नहीं"},
   {"value":"no","en":"No","mr":"नाही","hi":"नहीं"}]'),
-- 2. Social category
('category', 'member', 'choice', 2, 1, 'Caste category', 'जात प्रवर्ग', 'जाति वर्ग',
 '[{"value":"sc","en":"SC","mr":"अनुसूचित जाती (SC)","hi":"अनुसूचित जाति (SC)"},
   {"value":"st","en":"ST","mr":"अनुसूचित जमाती (ST)","hi":"अनुसूचित जनजाति (ST)"},
   {"value":"vjnt","en":"VJ / NT","mr":"विमुक्त जाती / भटक्या जमाती","hi":"विमुक्त जाति / घुमंतू जनजाति"},
   {"value":"obc","en":"OBC","mr":"इतर मागास वर्ग (OBC)","hi":"अन्य पिछड़ा वर्ग (OBC)"},
   {"value":"sbc","en":"SBC","mr":"विशेष मागास प्रवर्ग (SBC)","hi":"विशेष पिछड़ा वर्ग (SBC)"},
   {"value":"ews","en":"EWS","mr":"आर्थिकदृष्ट्या दुर्बल (EWS)","hi":"आर्थिक रूप से कमजोर (EWS)"},
   {"value":"general","en":"Open / General","mr":"खुला प्रवर्ग","hi":"सामान्य"}]'),
('minority', 'member', 'yes_no', 2, 2, 'From a minority community', 'अल्पसंख्याक समाजातील', 'अल्पसंख्यक समुदाय से', '[]'),
('disability_pct', 'member', 'number', 2, 3, 'Disability percentage (0 if none)', 'दिव्यांगत्व टक्केवारी (नसल्यास 0)', 'दिव्यांगता प्रतिशत (न हो तो 0)', '[]'),
-- 3. Family and income
('family_income', 'household', 'band', 3, 1, 'Family income a year', 'कुटुंबाचे वार्षिक उत्पन्न', 'परिवार की सालाना आय',
 '[{"value":"upto_21000","en":"Up to ₹21,000","mr":"₹21,000 पर्यंत","hi":"₹21,000 तक","min":0,"max":21000},
   {"value":"upto_100000","en":"₹21,000 to ₹1 lakh","mr":"₹21,000 ते ₹1 लाख","hi":"₹21,000 से ₹1 लाख","min":21001,"max":100000},
   {"value":"upto_250000","en":"₹1 lakh to ₹2.5 lakh","mr":"₹1 लाख ते ₹2.5 लाख","hi":"₹1 लाख से ₹2.5 लाख","min":100001,"max":250000},
   {"value":"upto_800000","en":"₹2.5 lakh to ₹8 lakh","mr":"₹2.5 लाख ते ₹8 लाख","hi":"₹2.5 लाख से ₹8 लाख","min":250001,"max":800000},
   {"value":"above_800000","en":"Above ₹8 lakh","mr":"₹8 लाखांपेक्षा जास्त","hi":"₹8 लाख से अधिक","min":800001}]'),
('family_size', 'household', 'number', 3, 2, 'People in the family', 'कुटुंबातील व्यक्ती', 'परिवार में सदस्य', '[]'),
('ration_card', 'household', 'choice', 3, 3, 'Ration card colour', 'रेशन कार्डचा रंग', 'राशन कार्ड का रंग',
 '[{"value":"yellow","en":"Yellow (BPL)","mr":"पिवळे (दारिद्र्यरेषेखालील)","hi":"पीला (BPL)"},
   {"value":"orange","en":"Orange / saffron","mr":"केशरी","hi":"केसरिया"},
   {"value":"white","en":"White","mr":"पांढरे","hi":"सफेद"},
   {"value":"aay","en":"Antyodaya (AAY)","mr":"अंत्योदय","hi":"अंत्योदय"},
   {"value":"annapurna","en":"Annapurna","mr":"अन्नपूर्णा","hi":"अन्नपूर्णा"},
   {"value":"none","en":"No ration card","mr":"रेशन कार्ड नाही","hi":"राशन कार्ड नहीं"}]'),
('it_payer', 'household', 'yes_no', 3, 4, 'Anyone in the family pays income tax', 'कुटुंबात कोणी आयकर भरतो का', 'परिवार में कोई आयकर देता है', '[]'),
('govt_employee', 'household', 'yes_no', 3, 5, 'Anyone in the family is a government employee or pensioner',
 'कुटुंबात कोणी सरकारी कर्मचारी किंवा निवृत्तीवेतनधारक आहे का', 'परिवार में कोई सरकारी कर्मचारी या पेंशनभोगी है', '[]'),
-- 4. Occupation
('occupation', 'member', 'choice', 4, 1, 'Main work', 'मुख्य व्यवसाय', 'मुख्य काम',
 '[{"value":"farmer","en":"Farmer","mr":"शेतकरी","hi":"किसान"},
   {"value":"labourer","en":"Labourer","mr":"मजूर","hi":"मजदूर"},
   {"value":"street_vendor","en":"Street vendor","mr":"फेरीवाला","hi":"रेहड़ी-पटरी विक्रेता"},
   {"value":"artisan","en":"Artisan / craftsperson","mr":"कारागीर","hi":"कारीगर"},
   {"value":"student","en":"Student","mr":"विद्यार्थी","hi":"विद्यार्थी"},
   {"value":"salaried","en":"Salaried job","mr":"नोकरी","hi":"नौकरी"},
   {"value":"self_employed","en":"Own business","mr":"स्वतःचा व्यवसाय","hi":"अपना व्यवसाय"},
   {"value":"homemaker","en":"Homemaker","mr":"गृहिणी","hi":"गृहिणी"},
   {"value":"unemployed","en":"No work","mr":"बेरोजगार","hi":"बेरोजगार"}]'),
('bocw_card', 'member', 'yes_no', 4, 2, 'Registered construction worker (BOCW card)', 'नोंदणीकृत बांधकाम कामगार (कामगार कार्ड)', 'पंजीकृत निर्माण श्रमिक', '[]'),
('eshram', 'member', 'yes_no', 4, 3, 'Has e-Shram card', 'ई-श्रम कार्ड आहे', 'ई-श्रम कार्ड है', '[]'),
-- 5. Land and housing
('land_ha', 'household', 'number', 5, 1, 'Farm land owned (hectares, 0 if none)', 'स्वतःची शेतजमीन (हेक्टर, नसल्यास 0)', 'खेती की जमीन (हेक्टेयर, न हो तो 0)', '[]'),
('land_since_2019', 'household', 'yes_no', 5, 2, 'Land held in the family''s name since before Feb 2019',
 'फेब्रुवारी 2019 पूर्वीपासून जमीन कुटुंबाच्या नावावर', 'फरवरी 2019 से पहले से जमीन परिवार के नाम', '[]'),
('house_type', 'household', 'choice', 5, 3, 'House', 'घर', 'घर',
 '[{"value":"pucca","en":"Pucca","mr":"पक्के","hi":"पक्का"},
   {"value":"kutcha","en":"Kutcha","mr":"कच्चे","hi":"कच्चा"},
   {"value":"none","en":"No house","mr":"घर नाही","hi":"घर नहीं"}]'),
-- 6. Life situation
('marital', 'member', 'choice', 6, 1, 'Marital status', 'वैवाहिक स्थिती', 'वैवाहिक स्थिति',
 '[{"value":"married","en":"Married","mr":"विवाहित","hi":"विवाहित"},
   {"value":"unmarried","en":"Unmarried","mr":"अविवाहित","hi":"अविवाहित"},
   {"value":"widow","en":"Widow / widower","mr":"विधवा / विधुर","hi":"विधवा / विधुर"},
   {"value":"divorced","en":"Divorced","mr":"घटस्फोटित","hi":"तलाकशुदा"},
   {"value":"abandoned","en":"Separated / abandoned","mr":"परित्यक्ता","hi":"परित्यक्त"}]'),
('maternity', 'member', 'choice', 6, 2, 'Pregnant or feeding a baby', 'गर्भवती किंवा स्तनदा', 'गर्भवती या स्तनपान',
 '[{"value":"pregnant","en":"Pregnant","mr":"गर्भवती","hi":"गर्भवती"},
   {"value":"lactating","en":"Feeding a baby","mr":"स्तनदा माता","hi":"स्तनपान कराने वाली"},
   {"value":"no","en":"No","mr":"नाही","hi":"नहीं"}]'),
('orphan', 'member', 'yes_no', 6, 3, 'Orphan', 'अनाथ', 'अनाथ', '[]'),
('serious_illness', 'member', 'yes_no', 6, 4, 'Has a listed serious illness (cancer, AIDS, leprosy…)',
 'गंभीर आजार (कर्करोग, एड्स, कुष्ठरोग…)', 'गंभीर बीमारी (कैंसर, एड्स, कुष्ठ…)', '[]'),
-- 7. Education
('student_level', 'member', 'choice', 7, 1, 'Studying now', 'सध्याचे शिक्षण', 'अभी पढ़ाई',
 '[{"value":"none","en":"Not studying","mr":"शिकत नाही","hi":"नहीं पढ़ रहे"},
   {"value":"class_1_10","en":"Class 1 to 10","mr":"इयत्ता 1 ते 10","hi":"कक्षा 1 से 10"},
   {"value":"class_11_12","en":"Class 11 or 12","mr":"इयत्ता 11 किंवा 12","hi":"कक्षा 11 या 12"},
   {"value":"diploma","en":"Diploma / ITI","mr":"पदविका / आयटीआय","hi":"डिप्लोमा / आईटीआई"},
   {"value":"graduate","en":"Degree","mr":"पदवी","hi":"स्नातक"},
   {"value":"postgraduate","en":"Post-graduate","mr":"पदव्युत्तर","hi":"स्नातकोत्तर"}]'),
-- 8. Existing benefits
('enrolled', 'household', 'multi', 8, 1, 'Already getting', 'आधीच मिळणारे लाभ', 'पहले से मिल रहे लाभ',
 '[{"value":"pm_kisan","en":"PM-KISAN","mr":"पीएम किसान","hi":"पीएम किसान"},
   {"value":"ladki_bahin","en":"Ladki Bahin","mr":"लाडकी बहीण","hi":"लाडकी बहीण"},
   {"value":"ayushman","en":"Ayushman / MJPJAY card","mr":"आयुष्मान / जनआरोग्य कार्ड","hi":"आयुष्मान कार्ड"},
   {"value":"pmay","en":"PM Awas house","mr":"पंतप्रधान आवास घरकुल","hi":"पीएम आवास"},
   {"value":"ujjwala","en":"Ujjwala gas","mr":"उज्ज्वला गॅस","hi":"उज्ज्वला गैस"},
   {"value":"pension","en":"Any government pension","mr":"कोणतेही शासकीय निवृत्तीवेतन","hi":"कोई सरकारी पेंशन"}]'),
-- 9. Documents held (not used for eligibility; tells the retailer what to arrange)
('docs', 'member', 'multi', 9, 1, 'Documents the person has', 'व्यक्तीकडे असलेली कागदपत्रे', 'व्यक्ति के पास दस्तावेज',
 '[{"value":"aadhaar","en":"Aadhaar","mr":"आधार कार्ड","hi":"आधार"},
   {"value":"bank_aadhaar","en":"Bank account linked to Aadhaar","mr":"आधार लिंक बँक खाते","hi":"आधार से जुड़ा बैंक खाता"},
   {"value":"ration_card","en":"Ration card","mr":"रेशन कार्ड","hi":"राशन कार्ड"},
   {"value":"caste_cert","en":"Caste certificate","mr":"जातीचा दाखला","hi":"जाति प्रमाणपत्र"},
   {"value":"income_cert","en":"Income certificate","mr":"उत्पन्नाचा दाखला","hi":"आय प्रमाणपत्र"},
   {"value":"domicile_cert","en":"Domicile certificate","mr":"अधिवास प्रमाणपत्र","hi":"अधिवास प्रमाणपत्र"},
   {"value":"land_record","en":"7/12 land record","mr":"7/12 उतारा","hi":"7/12 भूमि अभिलेख"}]');

-- Scheme drafts. Not live until a manager verifies and the owner approves.
insert into public.scheme_versions (scheme_id, change_note, source, data) values
('a0000000-0000-4000-8000-000000000001', 'Seed draft: verify every rule against the latest GR before submitting',
 'Public summaries, 21 Oct 2026 (unverified)',
 '{"code":"MH-LADKI-BAHIN","name_en":"Mukhyamantri Majhi Ladki Bahin Yojana","name_mr":"मुख्यमंत्री माझी लाडकी बहीण योजना",
   "level":"state","state":"MH","department":"Women and Child Development","category":"women_child",
   "benefit_en":"₹1,500 a month","benefit_mr":"दरमहा ₹1,500","benefit_type":"cash","benefit_yearly":18000,
   "apply_url":"https://ladakibahin.maharashtra.gov.in","apply_mode":"online","status":"open",
   "rules":[
     {"field":"gender","op":"=","value":"female"},
     {"field":"age","op":"between","value":[21,65]},
     {"field":"family_income","op":"<=","value":250000},
     {"field":"domicile_mh","op":"in","value":["certificate","no_certificate"]},
     {"is_exclusion":true,"field":"it_payer","op":"=","value":true,"question_mr":"कुटुंबात कोणी आयकर भरतो का?","question_en":"Does anyone in the family pay income tax?"},
     {"is_exclusion":true,"field":"govt_employee","op":"=","value":true,"question_mr":"कुटुंबात कोणी सरकारी कर्मचारी आहे का?","question_en":"Is anyone in the family a government employee?"}],
   "documents":[
     {"name_en":"Aadhaar card","name_mr":"आधार कार्ड"},
     {"name_en":"Domicile certificate or birth certificate","name_mr":"अधिवास प्रमाणपत्र किंवा जन्म दाखला","issued_by":"Tehsil (Aaple Sarkar)","help_service_code":"DOMICILE"},
     {"name_en":"Income certificate (or yellow/orange ration card)","name_mr":"उत्पन्नाचा दाखला (किंवा पिवळे/केशरी रेशन कार्ड)","issued_by":"Tehsil (Aaple Sarkar)","help_service_code":"INC"},
     {"name_en":"Bank passbook (Aadhaar-linked account)","name_mr":"बँक पासबुक (आधार लिंक खाते)"},
     {"name_en":"Photo","name_mr":"फोटो"}],
   "steps":[
     {"what_en":"Fill the form on the Ladki Bahin portal or Narishakti Doot app","what_mr":"लाडकी बहीण पोर्टल किंवा नारीशक्ती दूत अॅपवर अर्ज भरा","where_en":"Online","where_mr":"ऑनलाइन"},
     {"what_en":"Upload documents and the applicant''s live photo","what_mr":"कागदपत्रे आणि अर्जदाराचा फोटो अपलोड करा"},
     {"what_en":"Note the application number; status shows on the portal","what_mr":"अर्ज क्रमांक जपून ठेवा; स्थिती पोर्टलवर दिसते","typical_days":30}],
   "service_codes":[]}'),

('a0000000-0000-4000-8000-000000000002', 'Seed draft: verify every rule against the latest GR before submitting',
 'Public summaries, 21 Oct 2026 (unverified)',
 '{"code":"MH-NAMO-SHETKARI","name_en":"Namo Shetkari Mahasanman Nidhi","name_mr":"नमो शेतकरी महासन्मान निधी",
   "level":"state","state":"MH","department":"Agriculture","category":"agriculture",
   "benefit_en":"₹6,000 a year, on top of PM-KISAN","benefit_mr":"पीएम किसानसोबत वर्षाला ₹6,000","benefit_type":"cash","benefit_yearly":6000,
   "apply_mode":"offline","status":"open",
   "rules":[
     {"field":"land_ha","op":">","value":0},
     {"field":"land_since_2019","op":"=","value":true},
     {"field":"enrolled","op":"contains","value":"pm_kisan","question_mr":"कुटुंबाला पीएम किसान मिळते का?","question_en":"Does the family get PM-KISAN?"},
     {"is_exclusion":true,"field":"it_payer","op":"=","value":true},
     {"is_exclusion":true,"field":"govt_employee","op":"=","value":true}],
   "documents":[
     {"name_en":"Aadhaar card","name_mr":"आधार कार्ड"},
     {"name_en":"7/12 land record","name_mr":"7/12 उतारा","issued_by":"Talathi / Mahabhumi"},
     {"name_en":"Aadhaar-linked bank account","name_mr":"आधार लिंक बँक खाते"}],
   "steps":[
     {"what_en":"Make sure PM-KISAN e-KYC and land seeding are complete","what_mr":"पीएम किसान ई-केवायसी आणि जमीन नोंद पूर्ण असल्याची खात्री करा","where_en":"PM-KISAN portal","where_mr":"पीएम किसान पोर्टल"},
     {"what_en":"Payment comes automatically to eligible PM-KISAN farmers","what_mr":"पात्र पीएम किसान लाभार्थ्यांना रक्कम आपोआप मिळते"}],
   "service_codes":[]}'),

('a0000000-0000-4000-8000-000000000003', 'Seed draft: verify every rule against the latest GR before submitting',
 'Public summaries, 21 Oct 2026 (unverified)',
 '{"code":"MH-MJPJAY","name_en":"Mahatma Jyotiba Phule Jan Arogya Yojana","name_mr":"महात्मा ज्योतिराव फुले जन आरोग्य योजना",
   "level":"state","state":"MH","department":"Public Health","category":"health",
   "benefit_en":"Hospital cover up to ₹5 lakh per family a year (with Ayushman Bharat)","benefit_mr":"कुटुंबाला वर्षाला ₹5 लाखांपर्यंत रुग्णालय उपचार (आयुष्मान भारतसह)",
   "benefit_type":"insurance","apply_mode":"mixed","status":"open",
   "rules":[
     {"rule_group":1,"field":"ration_card","op":"in","value":["yellow","orange","white","aay","annapurna"]},
     {"rule_group":2,"field":"domicile_mh","op":"=","value":"certificate"},
     {"rule_group":3,"field":"bocw_card","op":"=","value":true}],
   "documents":[
     {"name_en":"Aadhaar card","name_mr":"आधार कार्ड"},
     {"name_en":"Ration card or domicile certificate","name_mr":"रेशन कार्ड किंवा अधिवास प्रमाणपत्र"}],
   "steps":[
     {"what_en":"Create the Ayushman / MJPJAY card","what_mr":"आयुष्मान / जनआरोग्य कार्ड काढा","where_en":"Beneficiary portal or empanelled hospital","where_mr":"लाभार्थी पोर्टल किंवा अंगीकृत रुग्णालय"}],
   "service_codes":[]}'),

('a0000000-0000-4000-8000-000000000004', 'Seed draft: verify every rule against the latest GR before submitting',
 'Public summaries, 21 Oct 2026 (unverified)',
 '{"code":"MH-SANJAY-GANDHI","name_en":"Sanjay Gandhi Niradhar Anudan Yojana","name_mr":"संजय गांधी निराधार अनुदान योजना",
   "level":"state","state":"MH","department":"Social Justice / Revenue","category":"pension",
   "benefit_en":"₹1,500 a month","benefit_mr":"दरमहा ₹1,500","benefit_type":"cash","benefit_yearly":18000,
   "apply_mode":"offline","status":"open",
   "rules":[
     {"rule_group":1,"field":"family_income","op":"<=","value":21000},{"rule_group":1,"field":"age","op":"<","value":65},{"rule_group":1,"field":"marital","op":"in","value":["widow","divorced","abandoned"]},
     {"rule_group":2,"field":"family_income","op":"<=","value":21000},{"rule_group":2,"field":"age","op":"<","value":65},{"rule_group":2,"field":"disability_pct","op":">=","value":40},
     {"rule_group":3,"field":"family_income","op":"<=","value":21000},{"rule_group":3,"field":"age","op":"<","value":65},{"rule_group":3,"field":"orphan","op":"=","value":true},
     {"rule_group":4,"field":"family_income","op":"<=","value":21000},{"rule_group":4,"field":"age","op":"<","value":65},{"rule_group":4,"field":"serious_illness","op":"=","value":true},
     {"rule_group":5,"field":"family_income","op":"<=","value":21000},{"rule_group":5,"field":"age","op":"<","value":65},{"rule_group":5,"field":"gender","op":"=","value":"transgender"},
     {"is_exclusion":true,"field":"enrolled","op":"contains","value":"pension","question_mr":"आधीच कोणते शासकीय निवृत्तीवेतन मिळते का?","question_en":"Already getting any government pension?"}],
   "documents":[
     {"name_en":"Age proof","name_mr":"वयाचा दाखला"},
     {"name_en":"Income certificate (up to ₹21,000)","name_mr":"उत्पन्नाचा दाखला (₹21,000 पर्यंत)","issued_by":"Tehsil (Aaple Sarkar)","help_service_code":"INC"},
     {"name_en":"Proof of the situation (death certificate, disability certificate, medical certificate)","name_mr":"परिस्थितीचा पुरावा (मृत्यू दाखला, दिव्यांग प्रमाणपत्र, वैद्यकीय प्रमाणपत्र)"},
     {"name_en":"Domicile proof","name_mr":"रहिवासी पुरावा"},
     {"name_en":"Bank passbook","name_mr":"बँक पासबुक"}],
   "steps":[
     {"what_en":"Submit the form to the Tehsil Sanjay Gandhi branch or through Aaple Sarkar","what_mr":"तहसील संजय गांधी शाखेत किंवा आपले सरकारमार्फत अर्ज द्या","where_en":"Tehsil office","where_mr":"तहसील कार्यालय"},
     {"what_en":"Committee approves; pension is paid to the bank account","what_mr":"समिती मंजुरीनंतर रक्कम बँक खात्यात जमा होते","typical_days":60}],
   "service_codes":[]}'),

('a0000000-0000-4000-8000-000000000005', 'Seed draft: verify every rule against the latest GR before submitting',
 'Public summaries, 21 Oct 2026 (unverified)',
 '{"code":"MH-SHRAVANBAL","name_en":"Shravanbal Seva Rajya Nivruttivetan Yojana","name_mr":"श्रावणबाळ सेवा राज्य निवृत्तीवेतन योजना",
   "level":"state","state":"MH","department":"Social Justice / Revenue","category":"pension",
   "benefit_en":"₹1,500 a month","benefit_mr":"दरमहा ₹1,500","benefit_type":"cash","benefit_yearly":18000,
   "apply_mode":"offline","status":"open",
   "rules":[
     {"field":"age","op":">=","value":65},
     {"field":"family_income","op":"<=","value":21000},
     {"is_exclusion":true,"field":"enrolled","op":"contains","value":"pension","question_mr":"आधीच कोणते शासकीय निवृत्तीवेतन मिळते का?","question_en":"Already getting any government pension?"}],
   "documents":[
     {"name_en":"Age proof (65+)","name_mr":"वयाचा दाखला (65+)"},
     {"name_en":"Income certificate (up to ₹21,000)","name_mr":"उत्पन्नाचा दाखला (₹21,000 पर्यंत)","issued_by":"Tehsil (Aaple Sarkar)","help_service_code":"INC"},
     {"name_en":"Domicile proof","name_mr":"रहिवासी पुरावा"},
     {"name_en":"Bank passbook","name_mr":"बँक पासबुक"}],
   "steps":[
     {"what_en":"Submit the form to the Tehsil Sanjay Gandhi branch or through Aaple Sarkar","what_mr":"तहसील संजय गांधी शाखेत किंवा आपले सरकारमार्फत अर्ज द्या","where_en":"Tehsil office","where_mr":"तहसील कार्यालय","typical_days":60}],
   "service_codes":[]}'),

('a0000000-0000-4000-8000-000000000006', 'Seed draft: verify every rule against the latest GR before submitting',
 'Public summaries, 21 Oct 2026 (unverified)',
 '{"code":"MH-POSTMATRIC-SC","name_en":"Post-Matric Scholarship for SC students (MahaDBT)","name_mr":"अनुसूचित जाती विद्यार्थ्यांसाठी मॅट्रिकोत्तर शिष्यवृत्ती (महाडीबीटी)",
   "level":"state","state":"MH","department":"Social Justice","category":"education",
   "benefit_en":"Tuition and exam fees plus a maintenance allowance","benefit_mr":"शिक्षण व परीक्षा शुल्क आणि निर्वाह भत्ता",
   "benefit_type":"cash","apply_url":"https://mahadbt.maharashtra.gov.in","apply_mode":"online","status":"seasonal",
   "rules":[
     {"field":"category","op":"=","value":"sc"},
     {"field":"student_level","op":"in","value":["class_11_12","diploma","graduate","postgraduate"]},
     {"field":"family_income","op":"<=","value":250000}],
   "documents":[
     {"name_en":"Caste certificate","name_mr":"जातीचा दाखला","issued_by":"SDO (Aaple Sarkar)","help_service_code":"CASTE"},
     {"name_en":"Income certificate","name_mr":"उत्पन्नाचा दाखला","issued_by":"Tehsil (Aaple Sarkar)","help_service_code":"INC"},
     {"name_en":"Previous year mark sheet","name_mr":"मागील वर्षाची गुणपत्रिका"},
     {"name_en":"College admission receipt","name_mr":"महाविद्यालय प्रवेश पावती"},
     {"name_en":"Aadhaar-linked bank account","name_mr":"आधार लिंक बँक खाते"}],
   "steps":[
     {"what_en":"Register and apply on MahaDBT during the application window","what_mr":"अर्ज कालावधीत महाडीबीटीवर नोंदणी करून अर्ज करा","where_en":"MahaDBT portal","where_mr":"महाडीबीटी पोर्टल"},
     {"what_en":"College verifies, then the department approves","what_mr":"महाविद्यालय पडताळणी, नंतर विभाग मंजुरी","typical_days":90}],
   "service_codes":[]}'),

('a0000000-0000-4000-8000-000000000007', 'Seed draft: verify every rule against the latest GR before submitting',
 'Public summaries, 21 Oct 2026 (unverified)',
 '{"code":"MH-BOCW","name_en":"Construction Workers Welfare Board benefits","name_mr":"बांधकाम कामगार कल्याण मंडळ लाभ",
   "level":"state","state":"MH","department":"Labour (MahaBOCW)","category":"welfare",
   "benefit_en":"Education, maternity, tools and other benefits for registered workers and families","benefit_mr":"नोंदणीकृत कामगार व कुटुंबासाठी शिक्षण, प्रसूती, साहित्य व इतर लाभ",
   "benefit_type":"other","apply_url":"https://mahabocw.in","apply_mode":"online","status":"open",
   "rules":[
     {"field":"bocw_card","op":"=","value":true,"question_mr":"बांधकाम कामगार म्हणून नोंदणी आहे का?","question_en":"Registered as a construction worker?"},
     {"field":"age","op":"between","value":[18,60]}],
   "documents":[
     {"name_en":"BOCW registration card","name_mr":"बांधकाम कामगार नोंदणी कार्ड"},
     {"name_en":"Aadhaar card","name_mr":"आधार कार्ड"},
     {"name_en":"Bank passbook","name_mr":"बँक पासबुक"}],
   "steps":[
     {"what_en":"Apply for the specific benefit on the MahaBOCW portal","what_mr":"महाबीओसीडब्ल्यू पोर्टलवर लाभासाठी अर्ज करा","where_en":"MahaBOCW portal","where_mr":"महाबीओसीडब्ल्यू पोर्टल"}],
   "service_codes":[]}');

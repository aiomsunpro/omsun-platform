import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang, RequestStatus } from "./types";

// English labels use Title Case (OMSUN convention). Marathi drafted by Claude,
// to be reviewed by the OMSUN team before release.
const en = {
  appName: "OMSUN Mitra",
  tagline: "OMSUN E-Seva Kendra Partner App",
  language: "Language",
  marathi: "मराठी",
  english: "English",

  // auth
  logIn: "Log In",
  signUp: "Sign Up",
  logOut: "Log Out",
  email: "Email",
  password: "Password",
  fullName: "Full Name",
  mobile: "Mobile Number",
  noAccount: "New Partner? Create An Account",
  haveAccount: "Already Registered? Log In",
  checkEmail: "Account created. Open the link we emailed you, then log in here.",
  passwordHint: "At least 6 characters",
  otpComingSoon: "Login with mobile OTP is coming soon. Use email and password for now.",
  forgotPassword: "Forgot Password?",
  resetSent: "We emailed you a link to set a new password.",
  enterEmailFirst: "Enter your email first.",

  // shop registration
  shopDetails: "Shop Details",
  shopDetailsIntro: "Tell us about your shop. OMSUN will check the details and approve your account.",
  businessName: "Shop Name",
  ownerName: "Owner Name",
  businessType: "Business Type",
  businessTypeHint: "Kirana, Mobile Shop, CSC, Xerox…",
  village: "Village",
  taluka: "Taluka",
  district: "District",
  pincode: "PIN Code",
  address: "Address",
  submitForApproval: "Submit For Approval",
  mobileTaken:
    "This mobile number is already registered with OMSUN. Please call the OMSUN office to link it to your login.",

  // pending
  awaitingApproval: "Waiting For Approval",
  awaitingApprovalBody:
    "Thank you for registering. The OMSUN team will verify your shop and call you. You can start sending requests once approved.",
  accountRejected: "Registration Not Approved",
  accountRejectedBody: "Please contact the OMSUN office for details.",
  accountSuspended: "Account Suspended",
  accountSuspendedBody: "Your account is on hold. Please contact the OMSUN office.",
  accountInactive: "This login is not active. Please contact the OMSUN office.",
  notRetailer: "This app is for OMSUN partners. Staff should use the OMSUN admin website.",
  checkAgain: "Check Again",

  // tabs
  home: "Home",
  requests: "Requests",
  earnings: "Earnings",
  profile: "Profile",

  // home
  hello: "Namaste",
  heroTitle: "Grow Your Business With OMSUN",
  heroSubtitle: "Send requests, track them live and earn on every service.",
  earningsHistory: "Earnings History",
  seeMore: "See More",
  trackRequests: "Track Requests",
  mitraId: "Mitra",
  quickActions: "Quick Actions",
  barNew: "Apply",
  tileServices: "Services",
  tileCustomers: "Clients",
  tileAlerts: "Alerts",
  tileDocs: "Docs Needed",
  tileTrack: "In Progress",
  newRequest: "New Request",
  servicesAndPrices: "Services & Prices",
  thisMonth: "This Month",
  openRequests: "Open",
  actionNeeded: "Action Needed",
  earnedThisMonth: "Earned This Month",
  recentRequests: "Recent Requests",
  viewAll: "View All",
  noRequestsYet: "No requests yet. Tap New Request to send your first one.",
  announcements: "Announcements",
  docsNeededBanner: "Requests Waiting For Your Documents",

  // requests list
  all: "All",
  open: "Open",
  completed: "Completed",
  closed: "Closed",
  searchRequests: "Search By Number Or Customer",
  nothingHere: "Nothing here.",

  // new request
  step: "Step",
  of: "of",
  customer: "Customer",
  service: "Service",
  documents: "Documents",
  review: "Review",
  chooseCustomer: "Choose Customer",
  searchCustomers: "Search Customers",
  addNewCustomer: "Add New Customer",
  saveCustomer: "Save Customer",
  chooseService: "Choose Service",
  searchServices: "Search Services",
  requiredDocuments: "Required Documents",
  optional: "Optional",
  addDocument: "Add",
  camera: "Camera",
  gallery: "Gallery",
  file: "File (PDF)",
  otherDocument: "Other Document",
  addOther: "Add Another Document",
  remarks: "Remarks For OMSUN",
  remarksHint: "Anything the office should know (optional)",
  next: "Next",
  back: "Back",
  submitRequest: "Submit Request",
  submitting: "Submitting…",
  uploading: "Uploading Documents",
  uploadNow: "Upload",
  missingDocsTitle: "Some Documents Missing",
  missingDocsBody: "Required documents are missing. Submit anyway? OMSUN may ask for them later.",
  submitAnyway: "Submit Anyway",
  cancel: "Cancel",
  remove: "Remove",
  customerPrice: "Customer Price",
  govtFee: "Govt Fee",
  serviceCharge: "Service Charge",
  yourCommission: "Your Commission",
  payToOmsun: "Pay To OMSUN",
  collectFromCustomer: "Collect From Customer",
  joinedOn: "Joined OMSUN",
  processingDays: "Processing Days",
  days: "days",
  requestSent: "Request Sent",
  someUploadsFailed: "The request was sent, but some documents did not upload. Add them again from the request page.",

  // request detail
  status: "Status",
  messageFromOmsun: "Message From OMSUN",
  uploadMissingDocs: "Upload The Missing Documents",
  timeline: "Timeline",
  yourDocuments: "Documents You Sent",
  finishedDocuments: "Completed Documents",
  noDocuments: "No documents yet.",
  addMoreDocuments: "Add More Documents",
  cancelRequest: "Cancel Request",
  cancelReason: "Reason For Cancelling",
  confirmCancel: "Confirm Cancel",
  paidToOmsun: "Paid To OMSUN",
  balanceToOmsun: "Balance To OMSUN",
  submittedOn: "Submitted",
  completedOn: "Completed",
  verified: "Verified",
  rejectedDoc: "Rejected",
  pendingCheck: "Being Checked",
  openFile: "Open",
  docName: "Document Name",

  // earnings
  onHold: "On Hold",
  earned: "Earned",
  settled: "Settled",
  onHoldHint: "Completed, waiting for full payment",
  earnedHint: "Ready for this month's settlement",
  dueToOmsun: "Due To OMSUN",
  dueToOmsunHint: "From completed requests, not yet paid to OMSUN",
  commissionHistory: "Commission History",
  monthlySettlements: "Monthly Settlements",
  noCommissions: "No commission yet. You earn it when a request is completed and paid.",
  received: "Received",
  balance: "Balance",
  draft: "Draft",
  finalized: "Final",

  // profile & more
  myShop: "My Shop",
  myCustomers: "My Customers",
  notifications: "Notifications",
  noNotifications: "No notifications yet.",
  markAllRead: "Mark All As Read",
  callOffice: "Call OMSUN Office",
  appVersion: "App Version",
  privacyPolicy: "Privacy Policy",
  deleteAccount: "Delete My Account",
  deleteAccountConfirm:
    "We will send a request to the OMSUN office to delete your account and personal data. The office will call you to confirm, and it is done within 30 days. Continue?",
  deleteAccountSent: "Request sent. The OMSUN office will call you to confirm.",
  confirm: "Yes, Send Request",
  noCustomers: "No customers yet. They are added when you create a request.",

  // generic
  save: "Save",
  loading: "Loading…",
  retry: "Retry",
  error: "Something went wrong",
  required: "Please fill this in",
  invalidMobile: "Enter a 10 digit mobile number",
  requestsCount: "requests",
} as const;

export type StringKey = keyof typeof en;

const mr: Record<StringKey, string> = {
  appName: "ओमसन मित्र",
  tagline: "ओमसन ई-सेवा केंद्र भागीदार ॲप",
  language: "भाषा",
  marathi: "मराठी",
  english: "English",

  logIn: "लॉग इन",
  signUp: "नोंदणी करा",
  logOut: "लॉग आउट",
  email: "ईमेल",
  password: "पासवर्ड",
  fullName: "पूर्ण नाव",
  mobile: "मोबाईल नंबर",
  noAccount: "नवीन भागीदार? खाते तयार करा",
  haveAccount: "आधीच नोंदणी केली आहे? लॉग इन करा",
  checkEmail: "खाते तयार झाले. आम्ही पाठवलेल्या ईमेलमधील लिंक उघडा, मग इथे लॉग इन करा.",
  passwordHint: "किमान ६ अक्षरे",
  otpComingSoon: "मोबाईल OTP ने लॉग इन लवकरच सुरू होईल. सध्या ईमेल आणि पासवर्ड वापरा.",
  forgotPassword: "पासवर्ड विसरलात?",
  resetSent: "नवीन पासवर्ड सेट करण्याची लिंक तुमच्या ईमेलवर पाठवली आहे.",
  enterEmailFirst: "आधी तुमचा ईमेल टाका.",

  shopDetails: "दुकानाची माहिती",
  shopDetailsIntro: "तुमच्या दुकानाची माहिती भरा. ओमसन टीम ती तपासून तुमचे खाते मंजूर करेल.",
  businessName: "दुकानाचे नाव",
  ownerName: "मालकाचे नाव",
  businessType: "व्यवसायाचा प्रकार",
  businessTypeHint: "किराणा, मोबाईल शॉप, CSC, झेरॉक्स…",
  village: "गाव",
  taluka: "तालुका",
  district: "जिल्हा",
  pincode: "पिन कोड",
  address: "पत्ता",
  submitForApproval: "मंजुरीसाठी पाठवा",
  mobileTaken:
    "हा मोबाईल नंबर ओमसनकडे आधीच नोंदलेला आहे. तो तुमच्या लॉग इनशी जोडण्यासाठी कृपया ओमसन ऑफिसला फोन करा.",

  awaitingApproval: "मंजुरीची प्रतीक्षा",
  awaitingApprovalBody:
    "नोंदणी केल्याबद्दल धन्यवाद. ओमसन टीम तुमचे दुकान तपासून तुम्हाला फोन करेल. मंजुरीनंतर तुम्ही अर्ज पाठवू शकाल.",
  accountRejected: "नोंदणी मंजूर झाली नाही",
  accountRejectedBody: "अधिक माहितीसाठी कृपया ओमसन ऑफिसशी संपर्क करा.",
  accountSuspended: "खाते तात्पुरते बंद",
  accountSuspendedBody: "तुमचे खाते थांबवले आहे. कृपया ओमसन ऑफिसशी संपर्क करा.",
  accountInactive: "हे लॉग इन सक्रिय नाही. कृपया ओमसन ऑफिसशी संपर्क करा.",
  notRetailer: "हे ॲप ओमसन भागीदारांसाठी आहे. कर्मचाऱ्यांनी ओमसन ॲडमिन वेबसाइट वापरावी.",
  checkAgain: "पुन्हा तपासा",

  home: "मुख्यपृष्ठ",
  requests: "अर्ज",
  earnings: "कमाई",
  profile: "प्रोफाइल",

  hello: "नमस्कार",
  heroTitle: "ओमसनसोबत तुमचा व्यवसाय वाढवा",
  heroSubtitle: "अर्ज पाठवा, प्रगती पहा आणि प्रत्येक सेवेवर कमवा.",
  earningsHistory: "कमाईचा तपशील",
  seeMore: "आणखी पहा",
  trackRequests: "अर्जांची प्रगती",
  mitraId: "मित्र",
  quickActions: "झटपट सेवा",
  barNew: "नवीन अर्ज",
  tileServices: "सेवा",
  tileCustomers: "ग्राहक",
  tileAlerts: "सूचना",
  tileDocs: "कागदपत्रे हवी",
  tileTrack: "चालू अर्ज",
  newRequest: "नवीन अर्ज",
  servicesAndPrices: "सेवा व दर",
  thisMonth: "या महिन्यात",
  openRequests: "चालू",
  actionNeeded: "तुमच्याकडून हवे",
  earnedThisMonth: "या महिन्याची कमाई",
  recentRequests: "अलीकडील अर्ज",
  viewAll: "सर्व पहा",
  noRequestsYet: "अजून एकही अर्ज नाही. पहिला अर्ज पाठवण्यासाठी 'नवीन अर्ज' दाबा.",
  announcements: "सूचना",
  docsNeededBanner: "अर्जांसाठी तुमच्याकडून कागदपत्रे हवी",

  all: "सर्व",
  open: "चालू",
  completed: "पूर्ण",
  closed: "बंद",
  searchRequests: "नंबर किंवा ग्राहकाचे नाव शोधा",
  nothingHere: "इथे काही नाही.",

  step: "पायरी",
  of: "पैकी",
  customer: "ग्राहक",
  service: "सेवा",
  documents: "कागदपत्रे",
  review: "तपासा",
  chooseCustomer: "ग्राहक निवडा",
  searchCustomers: "ग्राहक शोधा",
  addNewCustomer: "नवीन ग्राहक जोडा",
  saveCustomer: "ग्राहक जतन करा",
  chooseService: "सेवा निवडा",
  searchServices: "सेवा शोधा",
  requiredDocuments: "आवश्यक कागदपत्रे",
  optional: "ऐच्छिक",
  addDocument: "जोडा",
  camera: "कॅमेरा",
  gallery: "गॅलरी",
  file: "फाईल (PDF)",
  otherDocument: "इतर कागदपत्र",
  addOther: "आणखी कागदपत्र जोडा",
  remarks: "ओमसनसाठी टीप",
  remarksHint: "ऑफिसला काही सांगायचे असल्यास (ऐच्छिक)",
  next: "पुढे",
  back: "मागे",
  submitRequest: "अर्ज पाठवा",
  submitting: "पाठवत आहे…",
  uploading: "कागदपत्रे अपलोड होत आहेत",
  uploadNow: "अपलोड करा",
  missingDocsTitle: "काही कागदपत्रे बाकी",
  missingDocsBody: "आवश्यक कागदपत्रे जोडलेली नाहीत. तरीही पाठवायचे? ओमसन ती नंतर मागू शकते.",
  submitAnyway: "तरीही पाठवा",
  cancel: "रद्द",
  remove: "काढा",
  customerPrice: "ग्राहकाकडून शुल्क",
  govtFee: "सरकारी फी",
  serviceCharge: "सेवा शुल्क",
  yourCommission: "तुमचे कमिशन",
  payToOmsun: "ओमसनला द्यायचे",
  collectFromCustomer: "ग्राहकाकडून घ्यायचे",
  joinedOn: "ओमसनमध्ये सामील",
  processingDays: "लागणारे दिवस",
  days: "दिवस",
  requestSent: "अर्ज पाठवला",
  someUploadsFailed: "अर्ज पाठवला, पण काही कागदपत्रे अपलोड झाली नाहीत. अर्जाच्या पानावरून ती पुन्हा जोडा.",

  status: "स्थिती",
  messageFromOmsun: "ओमसनचा संदेश",
  uploadMissingDocs: "बाकी कागदपत्रे अपलोड करा",
  timeline: "प्रगती",
  yourDocuments: "तुम्ही पाठवलेली कागदपत्रे",
  finishedDocuments: "तयार कागदपत्रे",
  noDocuments: "अजून कागदपत्रे नाहीत.",
  addMoreDocuments: "आणखी कागदपत्रे जोडा",
  cancelRequest: "अर्ज रद्द करा",
  cancelReason: "रद्द करण्याचे कारण",
  confirmCancel: "रद्द करणे निश्चित करा",
  paidToOmsun: "ओमसनला दिले",
  balanceToOmsun: "ओमसनला बाकी",
  submittedOn: "पाठवला",
  completedOn: "पूर्ण झाला",
  verified: "तपासले",
  rejectedDoc: "नाकारले",
  pendingCheck: "तपासणी सुरू",
  openFile: "उघडा",
  docName: "कागदपत्राचे नाव",

  onHold: "थांबलेले",
  earned: "मिळालेले",
  settled: "हिशोब झालेले",
  onHoldHint: "पूर्ण झाले, पूर्ण पैसे येणे बाकी",
  earnedHint: "या महिन्याच्या हिशोबासाठी तयार",
  dueToOmsun: "ओमसनला देणे",
  dueToOmsunHint: "पूर्ण झालेल्या अर्जांचे, ओमसनला अजून न दिलेले",
  commissionHistory: "कमिशनचा तपशील",
  monthlySettlements: "मासिक हिशोब",
  noCommissions: "अजून कमिशन नाही. अर्ज पूर्ण होऊन पैसे भरले की कमिशन मिळते.",
  received: "मिळाले",
  balance: "बाकी",
  draft: "कच्चा",
  finalized: "अंतिम",

  myShop: "माझे दुकान",
  myCustomers: "माझे ग्राहक",
  notifications: "सूचना",
  noNotifications: "अजून सूचना नाहीत.",
  markAllRead: "सर्व वाचले",
  callOffice: "ओमसन ऑफिसला फोन करा",
  appVersion: "ॲप आवृत्ती",
  privacyPolicy: "गोपनीयता धोरण",
  deleteAccount: "माझे खाते हटवा",
  deleteAccountConfirm:
    "तुमचे खाते आणि वैयक्तिक माहिती हटवण्याची विनंती ओमसन ऑफिसला पाठवली जाईल. ऑफिस तुम्हाला कॉल करून खात्री करेल आणि ३० दिवसांत खाते हटवले जाईल. पुढे जायचे?",
  deleteAccountSent: "विनंती पाठवली. ओमसन ऑफिस तुम्हाला कॉल करेल.",
  confirm: "हो, विनंती पाठवा",
  noCustomers: "अजून ग्राहक नाहीत. अर्ज करताना ग्राहक जोडले जातात.",

  save: "जतन करा",
  loading: "लोड होत आहे…",
  retry: "पुन्हा प्रयत्न करा",
  error: "काहीतरी चूक झाली",
  required: "कृपया हे भरा",
  invalidMobile: "१० अंकी मोबाईल नंबर टाका",
  requestsCount: "अर्ज",
};

const STATUS: Record<Lang, Record<RequestStatus, string>> = {
  en: {
    new: "Submitted",
    assigned: "Assigned",
    documents_required: "Documents Required",
    documents_received: "Documents Received",
    under_process: "Under Process",
    pending: "Waiting On Office",
    completed: "Completed",
    rejected: "Rejected",
    cancelled: "Cancelled",
  },
  mr: {
    new: "पाठवला",
    assigned: "काम सोपवले",
    documents_required: "कागदपत्रे हवी",
    documents_received: "कागदपत्रे मिळाली",
    under_process: "काम सुरू",
    pending: "सरकारी कार्यालयात प्रलंबित",
    completed: "पूर्ण",
    rejected: "नाकारला",
    cancelled: "रद्द",
  },
};

const DICT: Record<Lang, Record<StringKey, string>> = { en, mr };
const LANG_KEY = "omsun.lang";

type I18n = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
  statusLabel: (s: RequestStatus) => string;
  /** Picks the Marathi or English column of a database row, falling back to English. */
  pick: (mrText: string | null | undefined, enText: string | null | undefined) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("mr");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => {
        if (v === "mr" || v === "en") setLangState(v);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key) => DICT[lang][key],
      statusLabel: (s) => STATUS[lang][s],
      pick: (mrText, enText) => (lang === "mr" && mrText ? mrText : enText || mrText || ""),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

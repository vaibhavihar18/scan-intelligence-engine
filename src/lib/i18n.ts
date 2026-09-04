export type Language = "en" | "mr" | "hi";

const translations: Record<string, Record<Language, string>> = {
  // Navigation & UI
  "app.name": { en: "AHAR X", mr: "आहार एक्स", hi: "आहार एक्स" },
  "nav.scan": { en: "New Scan", mr: "नवीन स्कॅन", hi: "नई स्कैन" },
  "nav.history": { en: "History", mr: "इतिहास", hi: "इतिहास" },
  "nav.profile": { en: "Profile", mr: "प्रोफाइल", hi: "प्रोफ़ाइल" },
  "nav.signIn": { en: "Get Started", mr: "सुरू करा", hi: "शुरू करें" },
  "nav.dashboard": { en: "Dashboard", mr: "डॅशबोर्ड", hi: "डैशबोर्ड" },

  // Landing page
  "landing.tagline": { en: "Label Intelligence — Not a Product Database", mr: "लेबल इंटेलिजन्स — उत्पादन डेटाबेस नाही", hi: "लेबल इंटेलिजेंस — उत्पादन डेटाबेस नाहीं" },
  "landing.title1": { en: "Know What You", mr: "तुम्ही खात असलेल्या", hi: "जानें आप क्या" },
  "landing.title2": { en: "Actually Eat", mr: "खरोखर काय खाता", hi: "असल में खा रहे हैं" },
  "landing.desc": { en: "AHAR X analyzes the actual package in your hand — front and back — to extract real label data, run compliance checks, and deliver transparent food intelligence.", mr: "AHAR X तुमच्या हातातील प्रत्यक्ष पॅकेज — समोर आणि माग — यांचे विश्लेषण करून प्रत्यक्ष लेबल डेटा काढतो, अनुरूपता तपासण्या चालवतो आणि पारदर्शक अन्न बुद्धिमत्ता देतो.", hi: "AHAR X आपके हाथ में मौजूद पैकेज का विश्लेषण करता है — सामने और पीछे — असली लेबल डेटा निकालने, अनुपालन जांच करने और पारदर्शी खाद्य जानकारी प्रदान करने के लिए।" },
  "landing.cta": { en: "Scan a Product Now", mr: "आता उत्पादन स्कॅन करा", hi: "अभी उत्पादन स्कैन करें" },
  "landing.noDatabase": { en: "No product database. No assumptions. Just your label.", mr: "उत्पादन डेटाबेस नाही. अनुमान नाही. फक्त तुमचे लेबल.", hi: "कोई उत्पादन डेटाबेस नहीं। कोई अनुमान नहीं। बस आपका लेबल।" },
  "landing.howItWorks": { en: "See how it works ↓", mr: "हे कसे काम करते पहा ↓", hi: "देखें यह कैसे काम करता है ↓" },

  // Features
  "features.title": { en: "Built for Real Label Intelligence", mr: "प्रत्यक्ष लेबल बुद्धिमत्तेसाठी बनवलेले", hi: "असली लेबल इंटेलिजेंस के लिए बनाया गया" },
  "features.subtitle": { en: "Every scan is a fresh analysis. AHAR X reads the package you hold, not a catalog entry.", mr: "प्रत्येक स्कॅन एक ताजी विश्लेषण आहे. AHAR X तुमच्याकडे असलेले पॅकेज वाचतो, न कॅटलॉग नोंद.", hi: "हर स्कैन एक ताज़ा विश्लेषण है। AHAR X आपके पास मौजूद पैकेज को पढ़ता है, कैटलॉग प्रविष्टि नहीं।" },
  "features.snap": { en: "Snap Front & Back", mr: "समोर आणि माग स्नॅप करा", hi: "सामने और पीछे स्नैप करें" },
  "features.snapDesc": { en: "Upload both sides of any food package — front label and back nutrition panel.", mr: "कोणत्याही अन्न पॅकेजच्या दोन्ही बाजू अपलोड करा — समोरचे लेबल आणि मागील पोषण पॅनेल.", hi: "किसी भी खाद्य पैकेज के दोनों पक्ष अपलोड करें — सामने का लेबल और पीछे का पोषण पैनल।" },
  "features.vision": { en: "AI Label Reading", mr: "AI लेबल वाचन", hi: "AI लेबल पठन" },
  "features.visionDesc": { en: "Our vision AI reads and extracts every detail: ingredients, nutrition facts, claims, allergens.", mr: "आमचा व्हिजन AI प्रत्येक तपशील वाचतो आणि काढतो: घटक, पोषण माहिती, दावे, अॅलर्जेन्स.", hi: "हमारा विज़न AI हर विवरण पढ़ता है और निकालता है: सामग्री, पोषण तथ्य, दावे, एलर्जन।" },
  "features.compliance": { en: "FSSAI Compliance", mr: "FSSAI अनुरूपता", hi: "FSSAI अनुपालन" },
  "features.complianceDesc": { en: "Instant regulatory checks against Indian food safety rules and labeling requirements.", mr: "भारतीय अन्न सुरक्षा नियम आणि लेबलिंग आवश्यकतांविरुद्ध त्वरित नियामक तपासण्या.", hi: "भारतीय खाद्य सुरक्षा नियमों और लेबलिंग आवश्यकताओं के खिलाफ तुरंत नियामक जांच।" },
  "features.score": { en: "AHAR X Score", mr: "AHAR X स्कोअर", hi: "AHAR X स्कोर" },
  "features.scoreDesc": { en: "A composite score evaluating transparency, nutrition quality, ingredient integrity, and claims.", mr: "पारदर्शकता, पोषण गुणवत्ता, घटक अखंडता आणि दावे यांचे मूल्यांकन करणारा एक समग्र स्कोअर.", hi: "पारदर्शिता, पोषण गुणवत्ता, सामग्री अखंडता और दावों का मूल्यांकन करने वाला एक संयुक्त स्कोर।" },

  // How it works
  "howItWorks.title": { en: "Three Steps to Full Transparency", mr: "संपूर्ण पारदर्शकतेसाठी तीन पायऱी", hi: "पूर्ण पारदर्शिता के लिए तीन कदम" },
  "howItWorks.step1.title": { en: "Upload Front Package", mr: "समोरचे पॅकेज अपलोड करा", hi: "सामने का पैकेज अपलोड करें" },
  "howItWorks.step1.desc": { en: "Point your camera or upload the front of any food product — even one never before scanned.", mr: "तुमचा कॅमेरा वापरा किंवा कोणत्याही अन्न उत्पादनाचा समोर अपलोड करा — आधी कधी स्कॅन न केलेलीही.", hi: "अपना कैमरा इस्तेमाल करें या किसी भी खाद्य उत्पादन का सामने अपलोड करें — यहां तक कि जिसे पहले कभी स्कैन नहीं किया गया हो।" },
  "howItWorks.step2.title": { en: "Upload Back Label", mr: "मागील लेबल अपलोड करा", hi: "पीछे का लेबल अपलोड करें" },
  "howItWorks.step2.desc": { en: "Capture the nutrition panel and ingredient list from the back of the same package.", mr: "त्याच पॅकेजच्या मागून पोषण पॅनेल आणि घटक यादी कॅप्चर करा.", hi: "उसी पैकेज के पीछे से पोषण पैनल और सामग्री सूची कैप्चर करें।" },
  "howItWorks.step3.title": { en: "Get Intelligence", mr: "बुद्धिमत्ता मिळवा", hi: "जानकारी प्राप्त करें" },
  "howItWorks.step3.desc": { en: "AHAR X reads the label, applies rules, and delivers a complete analysis with no database lookup.", mr: "AHAR X लेबल वाचतो, नियम लागू करतो आणि डेटाबेस शोध न करता संपूर्ण विश्लेषण देतो.", hi: "AHAR X लेबल पढ़ता है, नियम लागू करता है, और बिना डेटाबेस खोजे पूर्ण विश्लेषण प्रदान करता है।" },

  // Scan page
  "scan.title": { en: "Scan a Food Product", mr: "अन्न उत्पादन स्कॅन करा", hi: "खाद्य उत्पादन स्कैन करें" },
  "scan.desc": { en: "Upload the front and back of any food package. AHAR X will read and analyze the actual label — no product database required.", mr: "कोणत्याही अन्न पॅकेजचा समोर आणि माग अपलोड करा. AHAR X प्रत्यक्ष लेबल वाचेल आणि विश्लेषण करेल — उत्पादन डेटाबेस आवश्यक नाही.", hi: "किसी भी खाद्य पैकेज का सामने और पीछे अपलोड करें। AHAR X असली लेबल पढ़ेगा और विश्लेषण करेगा — किसी उत्पादन डेटाबेस की आवश्यकता नहीं।" },
  "scan.front": { en: "Front of Package", mr: "पॅकेजचा समोर", hi: "पैकेज का सामने" },
  "scan.back": { en: "Back of Package", mr: "पॅकेजचा माग", hi: "पैकेज का पीछे" },
  "scan.frontDesc": { en: "Brand name, highlighted claims, key ingredients", mr: "ब्रॅंड नाव, हायलाइट केलेले दावे, प्रमुख घटक", hi: "ब्रांड नाम, हाइलाइट किए गए दावे, प्रमुख सामग्री" },
  "scan.backDesc": { en: "Nutrition panel & ingredients", mr: "पोषण पॅनेल आणि घटक", hi: "पोषण पैनल और सामग्री" },
  "scan.frontUploaded": { en: "Front uploaded", mr: "समोर अपलोड झाला", hi: "सामने अपलोड हो गया" },
  "scan.backUploaded": { en: "Back uploaded", mr: "माग अपलोड झाला", hi: "पीछे अपलोड हो गया" },
  "scan.analyze": { en: "Analyze Product", mr: "उत्पादन विश्लेषण करा", hi: "उत्पादन का विश्लेषण करें" },
  "scan.newScan": { en: "New Scan", mr: "नवीन स्कॅन", hi: "नई स्कैन" },
  "scan.disclaimer": { en: "Both images must belong to the same scan session. Results are derived solely from what is visible on the uploaded images.", mr: "दोन्ही प्रतिमा एकाच स्कॅन सत्रात असणे आवश्यक आहे. परिणाम केवळ अपलोड केलेल्या प्रतिमांवर दिसणाऱ्या गोष्टींवरून व्युत्पन्न केले जातात.", hi: "दोनों चित्र एक ही स्कैन सत्र से संबंधित होने चाहिए। परिणाम केवल अपलोड किए गए चित्रों पर दिखाई देने वाली चीज़ों से प्राप्त होते हैं।" },
  "scan.selectProfile": { en: "Select Profile", mr: "प्रोफाइल निवडा", hi: "प्रोफ़ाइल चुनें" },
  "scan.selectLanguage": { en: "Language", mr: "भाषा", hi: "भाषा" },

  // Loading steps
  "loading.uploading": { en: "Uploading images...", mr: "प्रतिमा अपलोड होत आहेत...", hi: "चित्र अपलोड हो रहे हैं..." },
  "loading.frontRead": { en: "Reading front label...", mr: "समोरचे लेबल वाचत आहे...", hi: "सामने का लेबल पढ़ रहा है..." },
  "loading.backRead": { en: "Reading back label...", mr: "मागील लेबल वाचत आहे...", hi: "पीछे का लेबल पढ़ रहा है..." },
  "loading.ingredients": { en: "Extracting ingredients...", mr: "घटक काढत आहे...", hi: "सामग्री निकाल रहा है..." },
  "loading.nutrition": { en: "Extracting nutrition facts...", mr: "पोषण माहिती काढत आहे...", hi: "पोषण तथ्य निकाल रहा है..." },
  "loading.frontClaims": { en: "Checking front claims...", mr: "समोरचे दावे तपासत आहे...", hi: "सामने के दावे जांच रहा है..." },
  "loading.matching": { en: "Matching claims with ingredients...", mr: "दावे घटकांशी जुळवत आहे...", hi: "दावों को सामग्री से मिला रहा है..." },
  "loading.rules": { en: "Applying FSSAI rules...", mr: "FSSAI नियम लागू करत आहे...", hi: "FSSAI नियम लागू कर रहा है..." },
  "loading.profile": { en: "Checking profile suitability...", mr: "प्रोफाइल योग्यता तपासत आहे...", hi: "प्रोफ़ाइल उपयुक्तता जांच रहा है..." },
  "loading.score": { en: "Calculating AHAR X score...", mr: "AHAR X स्कोअर मोजत आहे...", hi: "AHAR X स्कोर की गणना हो रही है..." },
  "loading.explanation": { en: "Preparing explanation...", mr: "स्पष्टीकरण तयार करत आहे...", hi: "व्याख्या तैयार कर रहा है..." },

  // Result sections
  "result.title": { en: "AHAR X FOOD ANALYSIS", mr: "AHAR X अन्न विश्लेषण", hi: "AHAR X खाद्य विश्लेषण" },
  "result.scanId": { en: "Scan ID", mr: "स्कॅन ID", hi: "स्कैन ID" },
  "result.date": { en: "Date", mr: "तारीख", hi: "तिथि" },
  "result.profile": { en: "Profile", mr: "प्रोफाइल", hi: "प्रोफ़ाइल" },
  "result.language": { en: "Language", mr: "भाषा", hi: "भाषा" },

  // Section 1: Front claims
  "section.frontClaims": { en: "1. WHAT THE FRONT SAYS", mr: "१. समोर काय सांगतो", hi: "१. सामने क्या कहता है" },
  "section.frontClaimsDesc": { en: "Claims and highlights detected on the front of the package", mr: "पॅकेजच्या समोर आढळलेले दावे आणि हायलाइट्स", hi: "पैकेज के सामने पाए गए दावे और हाइलाइट" },

  // Section 2: Back declares
  "section.backDeclares": { en: "2. WHAT THE BACK DECLARES", mr: "२. माग काय घोषित करतो", hi: "२. पीछे क्या घोषित करता है" },
  "section.backDeclaresDesc": { en: "Ingredients and nutrition extracted from the back label image", mr: "मागील लेबल प्रतिमेतून काढलेले घटक आणि पोषण", hi: "पीछे के लेबल चित्र से निकाली गई सामग्री और पोषण" },

  // Section 3: Verification
  "section.verification": { en: "3. FRONT ↔ BACK VERIFICATION", mr: "३. समोर ↔ माग पडताळणी", hi: "३. सामने ↔ पीछे सत्यापन" },
  "section.verificationDesc": { en: "Cross-checking front claims against back ingredient declarations", mr: "समोरच्या दाव्यांची मागील घटक घोषणांशी पडताळणी", hi: "सामने के दावों की पीछे की सामग्री घोषणाओं से जांच" },

  // Section 4: Ingredients
  "section.ingredients": { en: "4. INGREDIENTS", mr: "४. घटक", hi: "४. सामग्री" },

  // Section 5: Nutrition
  "section.nutrition": { en: "5. NUTRITION", mr: "५. पोषण", hi: "५. पोषण" },

  // Section 6: Suitability
  "section.suitability": { en: "6. WHO IS THIS PRODUCT SUITABLE FOR?", mr: "६. हे उत्पादन कोणासाठी योग्य आहे?", hi: "६. यह उत्पादन किसके लिए उपयुक्त है?" },
  "profile.general": { en: "General Adult", mr: "सामान्य प्रौढ", hi: "सामान्य वयस्क" },
  "profile.child": { en: "Child", mr: "बालक", hi: "बच्चा" },
  "profile.fitness": { en: "Fitness-Focused", mr: "फिटनेस-केंद्रित", hi: "फिटनेस-केंद्रित" },
  "profile.weightConscious": { en: "Weight-Conscious", mr: "वजन-जागरूक", hi: "वज़न-सचेत" },
  "profile.vegetarian": { en: "Vegetarian", mr: "शाकाहारी", hi: "शाकाहारी" },
  "profile.highProtein": { en: "High-Protein Diet", mr: "उच्च-प्रथिन आहार", hi: "उच्च-प्रोटीन आहार" },
  "profile.suitable": { en: "Label-based suitability: Generally suitable", mr: "लेबल-आधारित योग्यता: सामान्यतः योग्य", hi: "लेबल-आधारित उपयुक्तता: सामान्यतः उपयुक्त" },
  "profile.useCaution": { en: "Label-based suitability: Use caution", mr: "लेबल-आधारित योग्यता: सावधान वापरा", hi: "लेबल-आधारित उपयुक्तता: सावधानी बरतें" },
  "profile.notRecommended": { en: "Label-based suitability: Not recommended for this profile", mr: "लेबल-आधारित योग्यता: या प्रोफाइलसाठी शिफारस नाही", hi: "लेबल-आधारित उपयुक्तता: इस प्रोफ़ाइल के लिए अनुशंसित नहीं" },
  "profile.insufficient": { en: "Not verified from the uploaded label.", mr: "अपलोड केलेल्या लेबलवरून पडताळले नाही.", hi: "अपलोड किए गए लेबल से सत्यापित नहीं।" },

  // Section 7: Personalized analysis
  "section.personalized": { en: "7. PERSONALIZED ANALYSIS", mr: "७. वैयक्तिकृत विश्लेषण", hi: "७. व्यक्तिगत विश्लेषण" },
  "analysis.checkedFor": { en: "Checked for", mr: "तपासले", hi: "जांचा गया" },
  "analysis.sugar": { en: "Sugar", mr: "साखर", hi: "चीनी" },
  "analysis.protein": { en: "Protein", mr: "प्रथिन", hi: "प्रोटीन" },
  "analysis.sodium": { en: "Sodium", mr: "सोडियम", hi: "सोडियम" },
  "analysis.calories": { en: "Calories", mr: "कॅलरी", hi: "कैलोरी" },
  "analysis.fibre": { en: "Fibre", mr: "अशुद्ध तंतू", hi: "फाइबर" },
  "analysis.fat": { en: "Saturated Fat", mr: "संतृप्त चरबी", hi: "संतृप्त वसा" },
  "analysis.allergen": { en: "Allergen", mr: "अॅलर्जेन", hi: "एलर्जन" },
  "analysis.ingredients": { en: "Important Ingredients", mr: "महत्त्वाचे घटक", hi: "महत्वपूर्ण सामग्री" },
  "analysis.high": { en: "High", mr: "जास्त", hi: "अधिक" },
  "analysis.moderate": { en: "Moderate", mr: "मध्यम", hi: "मध्यम" },
  "analysis.low": { en: "Low", mr: "कमी", hi: "कम" },
  "analysis.unknown": { en: "Unknown", mr: "अज्ञात", hi: "अज्ञात" },
  "analysis.present": { en: "Present on label", mr: "लेबलवर आढळला", hi: "लेबल पर मौजूद" },

  // Section 8: Score
  "section.score": { en: "8. AHAR X SCORE", mr: "८. AHAR X स्कोअर", hi: "८. AHAR X स्कोर" },
  "score.increasing": { en: "Factors increasing score", mr: "स्कोअर वाढवणारे घटक", hi: "स्कोर बढ़ाने वाले कारक" },
  "score.decreasing": { en: "Factors decreasing score", mr: "स्कोअर घटवणारे घटक", hi: "स्कोर घटाने वाले कारक" },
  "score.unavailable": { en: "Unavailable factors", mr: "अनुपलब्ध घटक", hi: "अनुपलब्ध कारक" },

  // Section 9: Explanation
  "section.explanation": { en: "9. SIMPLE EXPLANATION", mr: "९. सोपे स्पष्टीकरण", hi: "९. सरल व्याख्या" },

  // Section 10: Limitations
  "section.limitations": { en: "10. LIMITATIONS", mr: "१०. मर्यादा", hi: "१०. सीमाएं" },
  "limitations.standard": { en: "AHAR X analyzes the manufacturer's declared label information. It does not laboratory-test the product.", mr: "AHAR X उत्पादकाच्या घोषित लेबल माहितीचे विश्लेषण करतो. तो उत्पादनाची लॅबोरेटरी चाचणी करत नाही.", hi: "AHAR X निर्माता की घोषित लेबल जानकारी का विश्लेषण करता है। यह उत्पादन की प्रयोगशाला परीक्षा नहीं करता।" },
  "limitations.imageQuality": { en: "Some conclusions may be unavailable because the supplied label image could not be read reliably.", mr: "काही निष्कर्ष अनुपलब्ध असू शकतात कारण पुरवलेली लेबल प्रतिमा विश्वसनीयपणे वाचता आली नाही.", hi: "कुछ निष्कर्ष उपलब्ध नहीं हो सकते क्योंकि दिया गया लेबल चित्र विश्वसनीय रूप से नहीं पढ़ा जा सका।" },
  "limitations.noLab": { en: "AHAR X cannot laboratory-test the product. This finding is based only on the manufacturer's declared label.", mr: "AHAR X उत्पादनाची लॅबोरेटरी चाचणी करू शकत नाही. हा शोध केवळ उत्पादकाच्या घोषित लेबलवर आधारित आहे.", hi: "AHAR X उत्पादन की प्रयोगशाला परीक्षा नहीं कर सकता। यह निष्कर्ष केवल निर्माता की घोषित लेबल पर आधारित है।" },

  // Verification statuses
  "status.confirmed": { en: "CONFIRMED", mr: "पुष्ट", hi: "पुष्ट" },
  "status.potentialInconsistency": { en: "POTENTIAL INCONSISTENCY", mr: "संभाव्य विसंगती", hi: "संभावित असंगति" },
  "status.percentNotDeclared": { en: "INGREDIENT FOUND — PERCENTAGE NOT DECLARED", mr: "घटक सापडला — टक्केवारी घोषित नाही", hi: "सामग्री मिली — प्रतिशत घोषित नहीं" },
  "status.insufficientEvidence": { en: "NOT VERIFIED FROM LABEL", mr: "लेबलवरून पडताळले नाही", hi: "लेबल से सत्यापित नहीं" },
  "status.notReadable": { en: "NOT VERIFIED FROM LABEL", mr: "लेबलवरून पडताळले नाही", hi: "लेबल से सत्यापित नहीं" },
  "status.notDeclared": { en: "NOT DECLARED", mr: "घोषित नाही", hi: "घोषित नहीं" },

  // Verification table headers
  "verify.frontClaim": { en: "FRONT CLAIM", mr: "समोरचा दावा", hi: "सामने का दावा" },
  "verify.backLabel": { en: "BACK LABEL", mr: "मागील लेबल", hi: "पीछे का लेबल" },
  "verify.result": { en: "RESULT", mr: "परिणाम", hi: "परिणाम" },
  "verify.confidence": { en: "CONFIDENCE", mr: "विश्वास", hi: "विश्वास" },

  // Nutrition headers
  "nutrition.per": { en: "per", mr: "प्रति", hi: "प्रति" },
  "nutrition.calories": { en: "Calories", mr: "कॅलरी", hi: "कैलोरी" },
  "nutrition.protein": { en: "Protein", mr: "प्रथिन", hi: "प्रोटीन" },
  "nutrition.carbs": { en: "Carbohydrates", mr: "कार्बोहायड्रेट", hi: "कार्बोहाइड्रेट" },
  "nutrition.sugars": { en: "Sugars", mr: "साखर", hi: "चीनी" },
  "nutrition.fat": { en: "Total Fat", mr: "एकूण चरबी", hi: "कुल वसा" },
  "nutrition.satFat": { en: "Saturated Fat", mr: "संतृप्त चरबी", hi: "संतृप्त वसा" },
  "nutrition.transFat": { en: "Trans Fat", mr: "ट्रान्स चरबी", hi: "ट्रान्स वसा" },
  "nutrition.fibre": { en: "Fibre", mr: "अशुद्ध तंतू", hi: "फाइबर" },
  "nutrition.sodium": { en: "Sodium", mr: "सोडियम", hi: "सोडियम" },
  "nutrition.servingSize": { en: "Serving Size", mr: "सेवन आकार", hi: "सर्विंग साइज़" },

  // Score values
  "score.value.increases": { en: "Increases score", mr: "स्कोअर वाढवतो", hi: "स्कोर बढ़ाता है" },
  "score.value.decreases": { en: "Decreases score", mr: "स्कोअर घटवतो", hi: "स्कोर घटाता है" },
  "score.value.neutral": { en: "Neutral", mr: "तटस्थ", hi: "तटस्थ" },

  // Errors
  "error.network": { en: "Unable to connect to the analysis service. Please check your connection.", mr: "विश्लेषण सेवेशी जोडणी करता येत नाही. कृपया तुमची जोडणी तपासा.", hi: "विश्लेषण सेवा से कनेक्ट करने में असमर्थ। कृपया अपना कनेक्शन जांचें।" },
  "error.image": { en: "The uploaded image could not be processed.", mr: "अपलोड केलेली प्रतिमा प्रक्रिया करता आली नाही.", hi: "अपलोड किया गया चित्र संसाधित नहीं किया जा सका।" },
  "error.unreadable": { en: "The label could not be read reliably.", mr: "लेबल विश्वसनीयपणे वाचता आला नाही.", hi: "लेबल विश्वसनीय रूप से नहीं पढ़ा जा सका।" },
  "error.missingBack": { en: "Please upload the back of the package to complete verification.", mr: "पडताळणी पूर्ण करण्यासाठी कृपया पॅकेजचा माग अपलोड करा.", hi: "सत्यापन पूरा करने के लिए कृपया पैकेज का पीछे अपलोड करें।" },
  "error.config": { en: "Analysis service is not configured.", mr: "विश्लेषण सेवा कॉन्फिगर केलेली नाही.", hi: "विश्लेषण सेवा कॉन्फ़िगर नहीं है।" },
  "error.generic": { en: "Scan failed. Please try again.", mr: "स्कॅन अयशस्वी. कृपया पुन्हा प्रयत्न करा.", hi: "स्कैन विफल। कृपया पुनः प्रयास करें।" },

  // Profile analysis details
  "profileAnalysis.child": { en: "Child Suitability", mr: "बालक योग्यता", hi: "बच्चे की उपयुक्तता" },
  "profileAnalysis.fitness": { en: "Fitness Analysis", mr: "फिटनेस विश्लेषण", hi: "फिटनेस विश्लेषण" },
  "profileAnalysis.weight": { en: "Weight-Conscious Analysis", mr: "वजन-जागरूक विश्लेषण", hi: "वज़न-सचेत विश्लेषण" },
  "profileAnalysis.veg": { en: "Vegetarian Check", mr: "शाकाहारी तपासणी", hi: "शाकाहारी जांच" },
  "profileAnalysis.general": { en: "General Analysis", mr: "सामान्य विश्लेषण", hi: "सामान्य विश्लेषण" },

  // Allergen warning
  "allergen.warning": { en: "Contains / may contain allergens:", mr: "अॅलर्जेन्स समाविष्ट/असू शकतात:", hi: "एलर्जन शामिल/हो सकते हैं:" },

  // Score explanation
  "score.heading": { en: "AHAR X Score", mr: "AHAR X स्कोअर", hi: "AHAR X स्कोर" },
  "score.outOf": { en: "out of 10", mr: "१० मध्ये", hi: "१० में से" },
  "score.basedOn": { en: "Based on actual label data", mr: "प्रत्यक्ष लेबल डेटावर आधारित", hi: "असली लेबल डेटा पर आधारित" },

  // Ingredients section
  "ingredients.matched": { en: "Matched ingredients", mr: "जुळलेले घटक", hi: "मिलान की गई सामग्री" },
  "ingredients.notFound": { en: "Not found in back label", mr: "मागील लेबलमध्ये सापडले नाही", hi: "पीछे के लेबल में नहीं मिली" },
  "ingredients.uncertain": { en: "Uncertain reading", mr: "अनिश्चित वाचन", hi: "अनिश्चित पठन" },
  "ingredients.declaredPercentage": { en: "declared at", mr: "घोषित", hi: "घोषित" },

  // FSSAI
  "fssai.title": { en: "FSSAI Regulatory Check", mr: "FSSAI नियामक तपासणी", hi: "FSSAI नियामक जांच" },
  "fssai.compliant": { en: "Compliant", mr: "अनुरूप", hi: "अनुपालन" },
  "fssai.nonCompliant": { en: "Non-compliant", mr: "अनुरूप नाही", hi: "अनुपालन नहीं" },
  "fssai.insufficient": { en: "Insufficient evidence", mr: "अपुरा पुरावा", hi: "अपर्याप्त सबूत" },

  // Dashboard
  "dashboard.title": { en: "Scan History", mr: "स्कॅन इतिहास", hi: "स्कैन इतिहास" },
  "dashboard.subtitle": { en: "Your recent food label analyses", mr: "तुमचे अलीकडील अन्न लेबल विश्लेषण", hi: "आपके हालिया खाद्य लेबल विश्लेषण" },
  "dashboard.noScans": { en: "No scans yet", mr: "अद्याप स्कॅन नाही", hi: "अभी तक कोई स्कैन नहीं" },
  "dashboard.noScansDesc": { en: "Upload front and back images of any food product to get your first AHAR X analysis.", mr: "तुमचे पहिले AHAR X विश्लेषण मिळवण्यासाठी कोणत्याही अन्न उत्पादनाचे समोर आणि माग प्रतिमा अपलोड करा.", hi: "अपना पहला AHAR X विश्लेषण प्राप्त करने के लिए किसी भी खाद्य उत्पादन के सामने और पीछे के चित्र अपलोड करें।" },
  "dashboard.firstScan": { en: "Scan Your First Product", mr: "तुमचे पहिले उत्पादन स्कॅन करा", hi: "अपना पहला उत्पादन स्कैन करें" },
  "dashboard.loading": { en: "Loading scans...", mr: "स्कॅन लोड होत आहेत...", hi: "स्कैन लोड हो रहे हैं..." },
  "dashboard.unknownProduct": { en: "Unknown Product", mr: "अज्ञात उत्पादन", hi: "अज्ञात उत्पादन" },
  "dashboard.completed": { en: "Completed", mr: "पूर्ण", hi: "पूर्ण" },
  "dashboard.analyzing": { en: "Analyzing", mr: "विश्लेषण होत आहे", hi: "विश्लेषण हो रहा है" },
  "dashboard.failed": { en: "Failed", mr: "अयशस्वी", hi: "विफल" },
  "dashboard.allergen": { en: "allergen", mr: "अॅलर्जेन", hi: "एलर्जन" },
  "dashboard.allergens": { en: "allergens", mr: "अॅलर्जेन्स", hi: "एलर्जन" },
  "dashboard.claim": { en: "claim", mr: "दावा", hi: "दावा" },
  "dashboard.claims": { en: "claims", mr: "दावे", hi: "दावे" },

  // === CONCERN RADAR ===
  "concern.radar": { en: "CONCERN RADAR", mr: "चिंता रडार", hi: "चिंता रडार" },
  "concern.highSugar": { en: "High sugar", mr: "जास्त साखर", hi: "अधिक चीनी" },
  "concern.lowSugar": { en: "Low sugar", mr: "कमी साखर", hi: "कम चीनी" },
  "concern.highSodium": { en: "High sodium", mr: "जास्त सोडियम", hi: "अधिक सोडियम" },
  "concern.highSatFat": { en: "High saturated fat", mr: "जास्त संतृप्त चरबी", hi: "अधिक संतृप्त वसा" },
  "concern.lowProtein": { en: "Low protein", mr: "कमी प्रथिन", hi: "कम प्रोटीन" },
  "concern.lowFibre": { en: "Low fibre", mr: "कमी तंतू", hi: "कम फाइबर" },
  "concern.highCalories": { en: "High calories", mr: "जास्त कॅलरी", hi: "अधिक कैलोरी" },
  "concern.allergens": { en: "Declared allergens", mr: "घोषित अॅलर्जेन्स", hi: "घोषित एलर्जन" },
  "concern.noConcerns": { en: "No major concerns detected from the scanned label.", mr: "स्कॅन केलेल्या लेबलवरून प्रमुख चिंता आढळल्या नाही.", hi: "स्कैन किए गए लेबल से कोई प्रमुख चिंता नहीं मिली।" },

  // === PACKAGE INTELLIGENCE ===
  "pkg.title": { en: "PACKAGE INTELLIGENCE", mr: "पॅकेज इंटेलिजन्स", hi: "पैकेज इंटेलिजेंस" },
  "pkg.netQty": { en: "Net Quantity", mr: "एकूण प्रमाण", hi: "कुल मात्रा" },
  "pkg.manufacturer": { en: "Manufacturer", mr: "उत्पादक", hi: "निर्माता" },
  "pkg.batch": { en: "Batch No.", mr: "बॅच नं.", hi: "बैच नं." },
  "pkg.mfgDate": { en: "Mfg Date", mr: "उत्पादन तारीख", hi: "निर्माण तिथि" },
  "pkg.bestBefore": { en: "Best Before", mr: "सर्वोत्तम आधी", hi: "इससे पहले बेहतर" },
  "pkg.vegMark": { en: "Veg/Non-Veg", mr: "शाक/अशाक", hi: "शाकाहारी/अशाकाहारी" },
  "pkg.brand": { en: "Brand", mr: "ब्रॅंड", hi: "ब्रांड" },

  // === VALUE ANALYSIS ===
  "value.title": { en: "AHAR X VALUE", mr: "AHAR X किंमत", hi: "AHAR X कीमत" },
  "value.per100g": { en: "Per 100g", mr: "प्रति १००g", hi: "प्रति १००g" },
  "value.perServing": { en: "Per Serving", mr: "प्रति सेवन", hi: "प्रति सर्विंग" },
  "value.proteinPer100": { en: "Protein per ₹100", mr: "प्रथिन प्रति ₹१००", hi: "प्रोटीन प्रति ₹१००" },

  // === DATE CHECK ===
  "date.title": { en: "DATE CHECK", mr: "तारीख तपासणी", hi: "तिथि जांच" },
  "date.bestBefore": { en: "Best before", mr: "सर्वोत्तम आधी", hi: "इससे पहले बेहतर" },

  // === LABEL TRUST ===
  "labelTrust.title": { en: "LABEL CONSISTENCY CHECK", mr: "लेबल सुसंगतता तपासणी", hi: "लेबल संगतता जांच" },

  // === DECISION WORDING ===
  "decision.suitable": { en: "SUITABLE", mr: "योग्य", hi: "उपयुक्त" },
  "decision.occasional": { en: "OCCASIONAL", mr: "प्रकरणीय", hi: "कभी-कभी" },
  "decision.notIdeal": { en: "NOT IDEAL", mr: "योग्य नाही", hi: "उपयुक्त नहीं" },
  "decision.notRecommended": { en: "NOT RECOMMENDED", mr: "शिफारस नाही", hi: "अनुशंसित नहीं" },
  "decision.suitableRegular": { en: "SUITABLE AS A REGULAR CHOICE", mr: "नियमित पर्याय म्हणून योग्य", hi: "नियमित विकल्प के रूप में उपयुक्त" },
  "decision.notVerified": { en: "NOT VERIFIED FROM LABEL", mr: "लेबलवरून पडताळले नाही", hi: "लेबल से सत्यापित नहीं" },

  // === WHAT SHOULD I DO ===
  "action.title": { en: "WHAT SHOULD YOU DO?", mr: "तुम्हाला काय करावे लागेल?", hi: "आपको क्या करना चाहिए?" },

  // === KEY FINDINGS ===
  "findings.simple": { en: "KEY FINDINGS", mr: "प्रमुख शोध", hi: "मुख्य निष्कर्ष" },

  // === PRODUCT AT A GLANCE ===
  "glance.title": { en: "PRODUCT AT A GLANCE", mr: "उत्पादन एका नजरेत", hi: "उत्पादन पर एक नज़र" },

  // === COMPARISON ===
  "compare.title": { en: "COMPARE PRODUCTS", mr: "उत्पादने तुलना करा", hi: "उत्पादनों की तुलना करें" },
  "compare.better": { en: "BETTER CHOICE", mr: "चांगला पर्याय", hi: "बेहतर विकल्प" },
  "compare.why": { en: "Why?", mr: "का?", hi: "क्यों?" },
  "compare.addSecond": { en: "Add Another Product to Compare", mr: "तुलनेसाठी दुसरे उत्पादन जोडा", hi: "तुलना के लिए एक और उत्पादन जोड़ें" },
  "compare.lower": { en: "Lower", mr: "कमी", hi: "कम" },
  "compare.higher": { en: "Higher", mr: "जास्त", hi: "अधिक" },
  "compare.betterValue": { en: "Better value", mr: "चांगी किंमत", hi: "बेहतर कीमत" },

  // === VERDICT SECTION ===
  "verdict.yourResult": { en: "YOUR RESULT", mr: "तुमचा निष्कर्ष", hi: "आपका परिणाम" },
  "verdict.goodChoice": { en: "GOOD CHOICE", mr: "चांगला पर्याय", hi: "अच्छा विकल्प" },
  "verdict.occasional": { en: "OCCASIONAL / LIMITED", mr: "प्रकरणीय / मर्यादित", hi: "कभी-कभी / सीमित" },
  "verdict.notGoodChoice": { en: "NOT A GOOD CHOICE", mr: "चांगला पर्याय नाही", hi: "अच्छा विकल्प नहीं" },
  "verdict.insufficient": { en: "INSUFFICIENT LABEL EVIDENCE", mr: "अपुरा लेबल पुरावा", hi: "अपर्याप्त लेबल सबूत" },
  "verdict.oneLineVerdict": { en: "One-line verdict", mr: "एक-ओळ निष्कर्ष", hi: "एक-पंक्ति निष्कर्ष" },

  // Key findings
  "findings.title": { en: "KEY FINDINGS", mr: "प्रमुख शोध", hi: "मुख्य निष्कर्ष" },
  "findings.frontClaim": { en: "Front claims", mr: "समोरचे दावे", hi: "सामने के दावे" },
  "findings.backIngredients": { en: "Back ingredients", mr: "मागील घटक", hi: "पीछे की सामग्री" },
  "findings.verified": { en: "Verified ingredients", mr: "पडताळलेले घटक", hi: "सत्यापित सामग्री" },
  "findings.inconsistencies": { en: "Inconsistencies found", mr: "विसंगती आढळल्या", hi: "असंगति मिली" },
  "findings.noHighlights": { en: "No prominent front claims detected", mr: "प्रमुख समोरचे दावे आढळले नाही", hi: "कोई प्रमुख सामने का दावा नहीं मिला" },

  // Suitability grid
  "suitability.gridTitle": { en: "WHO IS THIS PRODUCT SUITABLE FOR?", mr: "हे उत्पादन कोणासाठी योग्य आहे?", hi: "यह उत्पादन किसके लिए उपयुक्त है?" },
  "suitability.child": { en: "Child", mr: "बालक", hi: "बच्चा" },
  "suitability.adult": { en: "Adult", mr: "प्रौढ", hi: "वयस्क" },
  "suitability.fitness": { en: "Fitness", mr: "फिटनेस", hi: "फिटनेस" },
  "suitability.weight": { en: "Weight-Conscious", mr: "वजन-जागरूक", hi: "वज़न-सचेत" },
  "suitability.veg": { en: "Vegetarian", mr: "शाकाहारी", hi: "शाकाहारी" },
  "suitability.highProtein": { en: "High-Protein", mr: "उच्च-प्रथिन", hi: "उच्च-प्रोटीन" },

  // Goal impact
  "goal.title": { en: "EFFECT ON YOUR GOAL", mr: "तुमच्या ध्येयावर परिणाम", hi: "आपके लक्ष्य पर प्रभाव" },
  "goal.child": { en: "For your child", mr: "तुमच्या बालकासाठी", hi: "आपके बच्चे के लिए" },
  "goal.fitness": { en: "For fitness goals", mr: "फिटनेस ध्येयांसाठी", hi: "फिटनेस लक्ष्यों के लिए" },
  "goal.weight": { en: "For weight management", mr: "वजन व्यवस्थापनासाठी", hi: "वजन प्रबंधन के लिए" },
  "goal.highProtein": { en: "For high-protein diet", mr: "उच्च-प्रथिन आहारासाठी", hi: "उच्च-प्रोटीन आहार के लिए" },
  "goal.general": { en: "For general health", mr: "सामान्य आरोग्यासाठी", hi: "सामान्य स्वास्थ्य के लिए" },

  // Simple explanation header
  "simpleWords.title": { en: "IN SIMPLE WORDS", mr: "सोप्या शब्दात", hi: "सरल शब्दों में" },

  // Allergen alert (simplified)
  "allergen.alert": { en: "ALLERGEN ALERT", mr: "अॅलर्जन सूचना", hi: "एलर्जन चेतावनी" },
  "allergen.contains": { en: "Contains", mr: "समाविष्ट", hi: "शामिल" },
  "allergen.mayContain": { en: "May contain", mr: "असू शकते", hi: "हो सकते हैं" },
  "allergen.warningText": { en: "Do not consume if you have an allergy to these ingredients.", mr: "या घटकांना अॅलर्जी असल्यास खाऊ नका.", hi: "इन सामग्री से एलर्जी हो तो इन्हें न खाएं।" },

  // Evidence section
  "evidence.title": { en: "DETAILED EVIDENCE", mr: "सविस्तर पुरावा", hi: "विस्तृत सबूत" },
  "evidence.front": { en: "FRONT", mr: "समोर", hi: "सामने" },
  "evidence.back": { en: "BACK", mr: "माग", hi: "पीछे" },
  "evidence.source": { en: "Source", mr: "स्रोत", hi: "स्रोत" },
  "evidence.text": { en: "Text", mr: "मजकूर", hi: "पाठ" },

  // Additional status labels
  "status.matched": { en: "MATCHED", mr: "जुळलेला", hi: "मिलान हुआ" },
  "status.frontClaimNotVerified": { en: "NOT CONFIRMED", mr: "पुष्ट नाही", hi: "पुष्टि नहीं हुई" },
  "status.frontClaimVerified": { en: "CONFIRMED", mr: "पुष्ट", hi: "पुष्ट" },
  "status.backReadable": { en: "Back label readable", mr: "मागील लेबल वाचता आला", hi: "पीछे का लेबल पठनीय" },
  "status.backNotReadable": { en: "Back label not fully readable", mr: "मागील लेबल पूर्णपणे वाचता आला नाही", hi: "पीछे का लेबल पूरी तरह पठनीय नहीं" },
};

export function t(key: string, lang: Language = "en"): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? key;
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "🇬🇧 English",
  mr: "🇮🇳 मराठी",
  hi: "🇮🇳 हिन्दी",
};

export const PROFILE_LABELS: Record<string, Record<Language, string>> = {
  general: { en: "General Adult", mr: "सामान्य प्रौढ", hi: "सामान्य वयस्क" },
  child: { en: "Child", mr: "बालक", hi: "बच्चा" },
  fitness: { en: "Fitness-Focused", mr: "फिटनेस-केंद्रित", hi: "फिटनेस-केंद्रित" },
  weight: { en: "Weight-Conscious", mr: "वजन-जागरूक", hi: "वज़न-सचेत" },
  vegetarian: { en: "Vegetarian", mr: "शाकाहारी", hi: "शाकाहारी" },
  highProtein: { en: "High-Protein Diet", mr: "उच्च-प्रथिन आहार", hi: "उच्च-प्रोटीन आहार" },
};

export const PROFILE_CATEGORIES = [
  "general",
  "child",
  "fitness",
  "weight",
  "vegetarian",
  "highProtein",
] as const;

export type ProfileCategory = (typeof PROFILE_CATEGORIES)[number];

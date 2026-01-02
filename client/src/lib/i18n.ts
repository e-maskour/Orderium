export type Language = 'ar' | 'fr';

export const translations = {
  ar: {
    // App
    appName: 'Orderium',
    tagline: 'نقطة البيع',
    
    // Navigation
    home: 'الرئيسية',
    menu: 'القائمة',
    cart: 'السلة',
    orders: 'الطلبات',
    
    // Categories
    all: 'الكل',
    allProducts: 'جميع المنتجات',
    products: 'المنتجات',
    services: 'الخدمات',
    
    // Product
    add: 'أضف',
    addToCart: 'أضف للسلة',
    updateQty: 'تحديث الكمية',
    outOfStock: 'غير متوفر',
    description: 'الوصف',
    price: 'السعر',
    remove: 'حذف',
    
    // Cart
    yourCart: 'السلة',
    emptyCart: 'السلة فارغة',
    emptyCartMessage: 'ابدأ بإضافة منتجات',
    continueShopping: 'تابع التسوق',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    total: 'المجموع الإجمالي',
    totalItems: 'إجمالي المنتجات',
    totalAmount: 'المبلغ الإجمالي',
    checkout: 'تأكيد الطلب',
    clearCart: 'إفراغ السلة',
    items: 'عناصر',
    item: 'عنصر',
    products: 'منتجات',
    product: 'منتج',
    pieces: 'قطع',
    piece: 'قطعة',
    addedToCart: 'تمت الإضافة إلى السلة',
    
    // Checkout
    checkoutTitle: 'إتمام الطلب',
    customerInfo: 'معلومات العميل',
    name: 'الاسم الكامل',
    namePlaceholder: 'أدخل اسمك',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'example@email.com',
    phone: 'رقم الهاتف',
    phonePlaceholder: '06XXXXXXXX',
    address: 'العنوان',
    addressPlaceholder: 'أدخل عنوانك',
    postalCode: 'الرمز البريدي',
    postalCodePlaceholder: 'XXXXX',
    orderSummary: 'ملخص الطلب',
    placeOrder: 'تأكيد الطلب',
    processing: 'جاري المعالجة...',
    
    // Validation
    nameRequired: 'الاسم مطلوب',
    phoneRequired: 'رقم الهاتف مطلوب',
    phoneInvalid: 'رقم الهاتف غير صالح',
    emailInvalid: 'البريد الإلكتروني غير صالح',
    
    // Success
    orderSuccess: 'تم الطلب بنجاح!',
    orderNumber: 'رقم الطلب',
    thankYou: 'شكراً لطلبك',
    orderConfirmation: 'سنتواصل معك قريباً لتأكيد الطلب',
    backToHome: 'العودة للرئيسية',
    
    // Search
    search: 'ابحث',
    searchProducts: 'ابحث عن المنتجات',
    searchPlaceholder: 'ابحث عن منتج، رمز أو باركود...',
    noResults: 'لا توجد نتائج',
    noResultsMessage: 'جرب كلمة بحث أخرى',
    noProductsInCategory: 'لا توجد منتجات في هذه الفئة',
    tryDifferentCategory: 'جرب فئة أخرى أو ابحث بشكل مختلف',
    productNotFound: 'المنتج غير موجود',
    
    // General
    currency: 'درهم',
    currencyCode: 'MAD',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    back: 'رجوع',
    close: 'إغلاق',
    
    // Product Details
    perUnit: '/ وحدة',
    code: 'الرمز',
    quantity: 'الكمية',
    clear: 'مسح',
    addMore: 'إضافة المزيد',
    quantityLabel: 'الكمية',
    
    // Pagination
    previous: 'السابق',
    next: 'التالي',
    gridView: 'عرض شبكي',
    listView: 'عرض قائمة',
    
    // Documents
    receipt: 'وصل',
    deliveryNote: 'وصل التسليم',
    chooseDocumentType: 'اختر نوع الوثيقة:',
    generating: 'جاري الإنشاء...',
    documentGenerationFailed: 'فشل في إنشاء الوثيقة',
    preview: 'معاينة',
    download: 'تحميل',
    shareWhatsApp: 'مشاركة عبر واتساب',
    
    // Customer
    existingCustomer: 'عميل موجود',
    newCustomer: 'عميل جديد',
    searching: 'بحث...',
    
    // Validation & Errors
    addressRequired: 'العنوان مطلوب',
    notSupported: 'غير مدعوم',
    warning: 'تحذير',
    
    // Location
    detectMyLocation: 'تحديد موقعي',
    locationDetected: 'تم تحديد الموقع',
    googleMaps: 'خرائط جوجل',
    waze: 'ويز',
    
    // Profile
    profile: 'الملف الشخصي',
    phoneNumber: 'رقم الهاتف',
    phoneCannotBeChanged: 'لا يمكن تغيير رقم الهاتف',
    enterYourName: 'أدخل اسمك',
    enterYourAddress: 'أدخل عنوانك',
    saveChanges: 'حفظ التغييرات',
    saving: 'جاري الحفظ...',
    saved: 'تم الحفظ',
    profileUpdated: 'تم تحديث معلوماتك بنجاح',
    updateFailed: 'فشل تحديث المعلومات',
    logout: 'تسجيل الخروج',
    coordinates: 'الإحداثيات',
    
    // Login
    phoneNumberRequired: 'رقم الهاتف مطلوب',
    phoneNumberInvalidFormat: 'رقم الهاتف غير صحيح (مثال: 0612345678)',
    passwordRequired: 'كلمة المرور مطلوبة',
    passwordMinLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    loginSuccess: 'تم تسجيل الدخول بنجاح',
    welcome: 'مرحباً بك!',
    accountCreatedSuccess: 'تم إنشاء الحساب بنجاح',
    loginFailed: 'فشل تسجيل الدخول',
    registrationFailed: 'فشل إنشاء الحساب',
    incorrectPassword: 'كلمة المرور غير صحيحة',
    errorOccurred: 'حدث خطأ، يرجى المحاولة مجدداً',
    verifying: 'جاري التحقق...',
    createNewAccount: 'إنشاء حساب جديد',
    login: 'تسجيل الدخول',
    appAccess: 'الوصول إلى التطبيق',
    createPasswordForNewAccount: 'أنشئ كلمة مرور لحسابك الجديد',
    enterPasswordToContinue: 'أدخل كلمة المرور للمتابعة',
    enterPhoneToStart: 'أدخل رقم هاتفك للبدء',
    createPassword: 'إنشاء كلمة مرور',
    password: 'كلمة المرور',
    createAccount: 'إنشاء الحساب',
    signIn: 'تسجيل الدخول',
    passwordMinLengthHint: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    enterValidMoroccanPhone: 'أدخل رقم هاتف مغربي صحيح (مثال: 0612345678)',
    yourInfoIsSecure: 'معلوماتك آمنة ولن تتم مشاركتها.',
    disconnect: 'تسجيل الخروج',
    
    // Invoice
    billTo: 'الفاتورة إلى:',
    invoiceNo: 'رقم الفاتورة:',
    date: 'التاريخ:',
    dueDate: 'تاريخ الاستحقاق:',
    paymentStatus: 'حالة الدفع:',
    paid: 'مدفوعة',
    no: 'رقم',
    item: 'المنتج',
    unitPrice: 'سعر الوحدة',
    previewDocument: 'معاينة',
    orderCreationError: 'حدث خطأ أثناء إنشاء الطلب، يرجى المحاولة مجدداً',
    
    // Receipt
    receiptNo: 'رقم الوصل:',
    user: 'العميل:',
    itemsCount: 'عدد المنتجات:',
    cash: 'نقداً:',
    paidAmount: 'المبلغ المدفوع:',
    change: 'الباقي:',
    
    // Language Toggle
    switchToFrench: 'Changer en français',
    switchToArabic: 'التبديل للعربية',
    
    // Location errors
    geolocationNotSupported: 'المتصفح لا يدعم تحديد الموقع',
    locationDetectionFailed: 'فشل تحديد الموقع',
    permissionDenied: 'يرجى السماح بالوصول إلى الموقع من إعدادات المتصفح',
    positionUnavailable: 'الموقع غير متاح. تأكد من تفعيل خدمات الموقع',
    timeout: 'انتهت مهلة تحديد الموقع. يرجى المحاولة مرة أخرى',
    locationError: 'خطأ في تحديد الموقع',
    coordinatesSaved: 'تم حفظ الإحداثيات. يمكنك تعديل العنوان يدوياً',
    locationSuccess: 'تم تحديد موقعك بنجاح',
    
    // Order Tracking & Status
    myOrders: 'طلباتي',
    trackOrder: 'تتبع الطلب',
    orderDetails: 'تفاصيل الطلب',
    viewDetails: 'التفاصيل',
    track: 'تتبع',
    follow: 'تتبع',
    cannotLoadOrders: 'لا يمكن تحميل الطلبات',
    noCustomerId: 'لا يوجد معرف عميل مرتبط بحسابك',
    noOrders: 'لا توجد طلبات',
    noOrdersYet: 'لم تقم بأي طلب بعد',
    trackAndManage: 'تتبع وإدارة جميع طلباتك',
    placedOn: 'تاريخ الطلب',
    orderNotFound: 'الطلب غير موجود',
    checkNumberAndRetry: 'تحقق من رقم الطلب وحاول مرة أخرى',
    noData: 'لا توجد بيانات',
    failedToLoad: 'فشل تحميل بيانات الطلب',
    currentStatus: 'الحالة الحالية',
    orderCanceled: 'تم إلغاء الطلب',
    orderWasCanceled: 'تم إلغاء هذا الطلب',
    enterOrderNumber: 'أدخل رقم الطلب',
    
    // Order Status
    statusPending: 'قيد الانتظار',
    statusToDelivery: 'للتوصيل',
    statusInDelivery: 'قيد التوصيل',
    statusDelivered: 'تم التسليم',
    statusCanceled: 'ملغي',
    statusAssigned: 'تم التعيين',
    
    // Status Descriptions
    orderReceived: 'تم استلام طلبك',
    readyToDeliver: 'جاهز للتوصيل',
    deliveryAssigned: 'تم تعيين مندوب التوصيل',
    onTheWay: 'في الطريق إليك',
    deliveredSuccessfully: 'تم تسليم الطلب بنجاح',
    
    // Success Page
    trackYourOrder: 'تتبع طلبك',
    
    // Not Found
    pageNotFound: 'الصفحة غير موجودة',
    oopsPageNotFound: 'عذراً! الصفحة غير موجودة',
    returnToHome: 'العودة للصفحة الرئيسية',
    
    // Customer
    previousOrders: 'طلبية سابقة',
  },
  fr: {
    // App
    appName: 'Orderium',
    tagline: 'Point de Vente',
    
    // Navigation
    home: 'Accueil',
    menu: 'Menu',
    cart: 'Panier',
    orders: 'Commandes',
    
    // Categories
    all: 'Tout',
    allProducts: 'Tous les produits',
    products: 'Produits',
    services: 'Services',
    
    // Product
    add: 'Ajouter',
    addToCart: 'Ajouter au panier',
    updateQty: 'Modifier la quantité',
    outOfStock: 'Rupture de stock',
    description: 'Description',
    price: 'Prix',
    remove: 'Supprimer',
    
    // Cart
    yourCart: 'Panier',
    emptyCart: 'Panier vide',
    emptyCartMessage: 'Commencez à ajouter des produits',
    continueShopping: 'Continuer vos achats',
    subtotal: 'Sous-total',
    discount: 'Remise',
    total: 'Total',
    totalItems: 'Total produits',
    totalAmount: 'Montant total',
    checkout: 'Passer la commande',
    clearCart: 'Vider le panier',
    items: 'articles',
    item: 'article',
    products: 'produits',
    product: 'produit',
    pieces: 'articles',
    piece: 'article',
    addedToCart: 'Ajouté au panier',
    
    // Checkout
    checkoutTitle: 'Finaliser la commande',
    customerInfo: 'Informations client',
    name: 'Nom complet',
    namePlaceholder: 'Entrez votre nom',
    email: 'Email',
    emailPlaceholder: 'example@email.com',
    phone: 'Téléphone',
    phonePlaceholder: '06XXXXXXXX',
    address: 'Adresse',
    addressPlaceholder: 'Entrez votre adresse',
    postalCode: 'Code postal',
    postalCodePlaceholder: 'XXXXX',
    orderSummary: 'Résumé de la commande',
    placeOrder: 'Confirmer la commande',
    processing: 'Traitement en cours...',
    
    // Validation
    nameRequired: 'Le nom est requis',
    phoneRequired: 'Le téléphone est requis',
    phoneInvalid: 'Numéro de téléphone invalide',
    emailInvalid: 'Email invalide',
    
    // Success
    orderSuccess: 'Commande réussie!',
    orderNumber: 'Numéro de commande',
    thankYou: 'Merci pour votre commande',
    orderConfirmation: 'Nous vous contacterons bientôt pour confirmer',
    backToHome: 'Retour à l\'accueil',
    
    // Search
    search: 'Rechercher',
    searchProducts: 'Rechercher des produits',
    searchPlaceholder: 'Rechercher un produit, code ou code-barres...',
    noResults: 'Aucun résultat trouvé',
    noResultsMessage: 'Essayez un autre terme de recherche',
    noProductsInCategory: 'Aucun produit dans cette catégorie',
    tryDifferentCategory: 'Essayez une autre catégorie ou recherche',
    productNotFound: 'Produit non trouvé',
    
    // General
    currency: 'DH',
    currencyCode: 'MAD',
    loading: 'Chargement...',
    error: 'Une erreur est survenue',
    retry: 'Réessayer',
    back: 'Retour',
    close: 'Fermer',
    
    // Product Details
    perUnit: '/ unité',
    code: 'Code',
    quantity: 'Quantité',
    clear: 'Effacer',
    addMore: 'Ajouter plus',
    quantityLabel: 'Qté',
    
    // Pagination
    previous: 'Précédent',
    next: 'Suivant',
    gridView: 'Vue grille',
    listView: 'Vue liste',
    
    // Documents
    receipt: 'Reçu',
    deliveryNote: 'Bon de Livraison',
    chooseDocumentType: 'Choisir le type de document:',
    generating: 'Génération...',
    documentGenerationFailed: 'Échec de génération du document',
    preview: 'Aperçu',
    download: 'Télécharger',
    shareWhatsApp: 'Partager via WhatsApp',
    
    // Customer
    existingCustomer: 'Client existant',
    newCustomer: 'Nouveau client',
    searching: 'Recherche...',
    
    // Validation & Errors
    addressRequired: 'Adresse requise',
    notSupported: 'Non supporté',
    warning: 'Avertissement',
    
    // Location
    detectMyLocation: 'Détecter ma position',
    locationDetected: 'Position détectée',
    googleMaps: 'Google Maps',
    waze: 'Waze',
    
    // Profile
    profile: 'Profil',
    phoneNumber: 'Numéro de téléphone',
    phoneCannotBeChanged: 'Le numéro de téléphone ne peut pas être modifié',
    enterYourName: 'Entrez votre nom',
    enterYourAddress: 'Entrez votre adresse',
    saveChanges: 'Enregistrer les modifications',
    saving: 'Enregistrement...',
    saved: 'Enregistré',
    profileUpdated: 'Vos informations ont été mises à jour',
    updateFailed: 'Échec de mise à jour',
    logout: 'Se déconnecter',
    coordinates: 'Coordonnées',
    
    // Login
    phoneNumberRequired: 'Numéro de téléphone requis',
    phoneNumberInvalidFormat: 'Numéro invalide (ex: 0612345678)',
    passwordRequired: 'Mot de passe requis',
    passwordMinLength: 'Le mot de passe doit contenir au moins 6 caractères',
    loginSuccess: 'Connexion réussie',
    welcome: 'Bienvenue!',
    accountCreatedSuccess: 'Compte créé avec succès',
    loginFailed: 'Échec de connexion',
    registrationFailed: 'Échec de création',
    incorrectPassword: 'Mot de passe incorrect',
    errorOccurred: 'Une erreur est survenue',
    verifying: 'Vérification...',
    createNewAccount: 'Créer un compte',
    login: 'Connexion',
    appAccess: "Accès à l'application",
    createPasswordForNewAccount: 'Créez un mot de passe pour votre nouveau compte',
    enterPasswordToContinue: 'Entrez votre mot de passe pour continuer',
    enterPhoneToStart: 'Entrez votre numéro pour commencer',
    createPassword: 'Créer un mot de passe',
    password: 'Mot de passe',
    createAccount: 'Créer le compte',
    signIn: 'Se connecter',
    passwordMinLengthHint: 'Le mot de passe doit contenir au moins 6 caractères',
    enterValidMoroccanPhone: 'Entrez un numéro marocain valide (ex: 0612345678)',
    yourInfoIsSecure: "Votre informations est sécurisée et ne sera pas partagée.",
    disconnect: 'Se déconnecter',
    
    // Invoice
    billTo: 'Bill To:',
    invoiceNo: 'Invoice No.:',
    date: 'Date:',
    dueDate: 'Due date:',
    paymentStatus: 'Payment status:',
    paid: 'Paid',
    no: 'No.',
    item: 'Item',
    unitPrice: 'Unit price',
    previewDocument: 'Aperçu',
    orderCreationError: 'Erreur lors de la création de la commande',
    
    // Receipt
    receiptNo: 'Receipt No.:',
    user: 'User:',
    itemsCount: 'Items count:',
    cash: 'Cash:',
    paidAmount: 'Paid amount:',
    change: 'Change:',
    
    // Language Toggle
    switchToFrench: 'Changer en français',
    switchToArabic: 'التبديل للعربية',
    
    // Location errors
    geolocationNotSupported: 'Le navigateur ne supporte pas la géolocalisation',
    locationDetectionFailed: 'Échec de localisation',
    permissionDenied: 'Veuillez autoriser l\'accès à la position dans les paramètres du navigateur',
    positionUnavailable: 'Position non disponible. Vérifiez que les services de localisation sont activés',
    timeout: 'Délai d\'attente dépassé. Veuillez réessayer',
    locationError: 'Erreur de localisation',
    coordinatesSaved: 'Coordonnées sauvegardées. Vous pouvez modifier l\'adresse manuellement',
    locationSuccess: 'Votre position a été détectée avec succès',
    
    // Order Tracking & Status
    myOrders: 'Mes commandes',
    trackOrder: 'Suivre commande',
    orderDetails: 'Détails de commande',
    viewDetails: 'Détails',
    track: 'Suivre',
    follow: 'Suivre',
    cannotLoadOrders: 'Impossible de charger',
    noCustomerId: 'Aucun ID client associé à votre compte',
    noOrders: 'Aucune commande',
    noOrdersYet: "Vous n'avez pas encore passé de commande",
    trackAndManage: 'Suivez et gérez toutes vos commandes',
    placedOn: 'Date de commande',
    orderNotFound: 'Commande introuvable',
    checkNumberAndRetry: 'Vérifiez le numéro et réessayez',
    noData: 'Aucune donnée',
    failedToLoad: 'Échec du chargement',
    currentStatus: 'État actuel',
    orderCanceled: 'Commande annulée',
    orderWasCanceled: 'Cette commande a été annulée',
    enterOrderNumber: 'Entrez le numéro',
    
    // Order Status
    statusPending: 'En attente',
    statusToDelivery: 'À livrer',
    statusInDelivery: 'En livraison',
    statusDelivered: 'Livré',
    statusCanceled: 'Annulé',
    statusAssigned: 'Assigné',
    
    // Status Descriptions
    orderReceived: 'Commande reçue',
    readyToDeliver: 'Prêt à livrer',
    deliveryAssigned: 'Livreur assigné',
    onTheWay: 'En route vers vous',
    deliveredSuccessfully: 'Commande livrée avec succès',
    
    // Success Page
    trackYourOrder: 'Suivre votre commande',
    
    // Not Found
    pageNotFound: 'Page non trouvée',
    oopsPageNotFound: 'Oops! Page non trouvée',
    returnToHome: "Retour à l'accueil",
    
    // Customer
    previousOrders: 'commande(s) précédente(s)',
  },
};

export type TranslationKey = keyof typeof translations.ar;

export const formatCurrency = (amount: number, lang: Language): string => {
  const formatted = amount.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  if (lang === 'ar') {
    return `${formatted} د.م`;
  }
  return `${formatted} DH`;
};

export const formatPhone = (phone: string): string => {
  // Moroccan phone format: 06 XX XX XX XX or +212 6 XX XX XX XX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
};

export const validateMoroccanPhone = (phone: string): boolean => {
  // Moroccan mobile: 06, 07 or +212 6/7
  const cleaned = phone.replace(/\D/g, '');
  const mobilePattern = /^(0[67]\d{8}|212[67]\d{8})$/;
  return mobilePattern.test(cleaned);
};

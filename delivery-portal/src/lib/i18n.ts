export type Language = 'ar' | 'fr';

export const translations = {
  ar: {
    // App
    appName: 'Orderium',
    tagline: 'بوابة التوصيل',

    // Navigation
    myDeliveries: 'مهامي',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    signOut: 'تسجيل الخروج',

    // Auth
    login: 'تسجيل الدخول',
    phoneNumber: 'رقم الهاتف',
    password: 'كلمة المرور',
    enterPhoneNumber: 'أدخل رقم الهاتف',
    enterPassword: 'أدخل كلمة المرور',
    phoneNumberRequired: 'رقم الهاتف مطلوب',
    passwordRequired: 'كلمة المرور مطلوبة',
    invalidCredentials: 'بيانات الدخول غير صحيحة',
    loginFailed: 'فشل تسجيل الدخول',
    welcomeBack: 'مرحباً بعودتك',

    // Orders
    orders: 'الطلبات',
    order: 'طلب',
    all: 'الكل',
    allOrders: 'جميع الطلبات',
    pending: 'قيد الانتظار',
    assigned: 'معين',
    confirmed: 'مؤكد',
    pickedUp: 'تم الاستلام',
    toDelivery: 'للتوصيل',
    inDelivery: 'قيد التوصيل',
    delivered: 'تم التوصيل',
    canceled: 'ملغي',
    deliveryStatus: 'حالة التسليم',
    total: 'المجموع',
    noOrdersFound: 'لا توجد طلبات',
    noOrdersMessage: 'لا توجد طلبات',
    noOrdersAssigned: 'لم يتم تعيين أي طلبات لك بعد',
    searchOrders: 'ابحث برقم الطلب، اسم العميل أو رقم الهاتف',

    // Filters
    filters: 'الفلاتر',
    enterOrderNumber: 'أدخل رقم الطلب',
    enterCustomerName: 'أدخل اسم العميل',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    dateRange: 'نطاق التاريخ',
    apply: 'تطبيق',
    reset: 'إعادة تعيين',

    // Date Range Picker
    period: 'الفترة',
    start: 'البداية',
    end: 'النهاية',
    selectDates: 'اختر التواريخ',
    selectDateRange: 'اختر نطاق التاريخ',
    predefinedPeriod: 'فترة محددة مسبقاً',
    today: 'اليوم',
    yesterday: 'أمس',
    thisWeek: 'هذا الأسبوع',
    lastWeek: 'الأسبوع الماضي',
    thisMonth: 'هذا الشهر',
    lastMonth: 'الشهر الماضي',
    thisYear: 'هذا العام',
    lastYear: 'العام الماضي',
    ok: 'موافق',

    // Pagination
    showing: 'عرض',
    to: 'إلى',
    of: 'من',
    results: 'نتائج',
    perPage: 'لكل صفحة',

    // Order Details
    orderNumber: 'رقم الطلب',
    customer: 'العميل',
    customerName: 'اسم العميل',
    customerPhone: 'هاتف العميل',
    customerAddress: 'عنوان العميل',
    orderSummary: 'ملخص الطلب',
    uniqueProducts: 'منتجات مختلفة',
    totalItems: 'إجمالي القطع',
    totalAmount: 'المبلغ الإجمالي',

    // Actions
    confirmOrder: 'تأكيد الطلب',
    pickUpOrder: 'استلام الطلب',
    startToDelivery: 'بدء التوصيل',
    startDelivery: 'في طريق التوصيل',
    markAsDelivered: 'تأكيد التسليم',
    orderDelivered: 'تم التسليم بنجاح',
    orderCanceled: 'تم إلغاء الطلب',
    googleMaps: 'خرائط جوجل',
    waze: 'ويز',
    statusUpdated: 'تم تحديث الحالة بنجاح',
    statusUpdateFailed: 'فشل تحديث الحالة',

    // Status
    status: 'الحالة',
    assignedStatus: 'معين',
    toDeliveryStatus: 'للتوصيل',
    inDeliveryStatus: 'قيد التوصيل',
    deliveredStatus: 'تم التسليم',
    canceledStatus: 'ملغي',

    // General
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    close: 'إغلاق',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    delete: 'حذف',
    edit: 'تعديل',

    // Messages
    updating: 'جاري التحديث...',
    updateSuccess: 'تم التحديث بنجاح',
    updateFailed: 'فشل التحديث',
    tryAgain: 'حاول مرة أخرى',

    // Profile
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',

    // Language Toggle
    switchToFrench: 'Changer en français',
    switchToArabic: 'التبديل للعربية',

    // Login page UI
    deliveryPortal: 'بوابة التوصيل',
    deliveryDriverAccess: 'وصول السائق',
    loginHeroTitle: 'على الطريق،',
    loginHeroSubtitle: 'تحت السيطرة.',
    loginHeroDesc: 'أدر توصيلاتك وتنقل عبر المسارات وأكد الطلبات أثناء التنقل.',
    loginSignInDesc: 'سجل دخولك لعرض طلباتك المعينة وبدء نوبتك.',
    loginFeatureRoute: 'التنقل في المسارات',
    loginFeatureOrderMgmt: 'إدارة الطلبات',
    loginFeatureLiveTracking: 'التتبع المباشر',
    loginFeatureShift: 'تقارير النوبات',

    // Currency
    currency: 'د.م',
    dh: 'درهم',

    // Notifications
    notifications: 'الإشعارات',
    noNotifications: 'لا توجد إشعارات',
    markAllRead: 'تعليم الكل كمقروء',
    allNotificationsMarkedAsRead: 'تم تعليم جميع الإشعارات كمقروءة',
    justNow: 'الآن',
    minutesAgo: 'د',
    hoursAgo: 'س',
    daysAgo: 'ي',
    'notifications.newOrder': 'طلب جديد',
    'notifications.orderAssigned': 'تم تعيين الطلب',
    'notifications.statusChanged': 'تحديث الحالة',
    'notifications.orderCancelled': 'طلب ملغي',
    'status.to_delivery': 'للتوصيل',
    'status.in_delivery': 'قيد التوصيل',
    'status.delivered': 'تم التسليم',
    'status.canceled': 'ملغي',

    // Bottom nav tabs
    ordersTab: 'طلباتي',
    inProgressTab: 'جارية',
    deliveredTab: 'مسلّمة',
    profileTab: 'ملفي',

    // Order detail / actions
    backToOrders: 'رجوع',
    callCustomer: 'اتصال',
    viewOnMaps: 'التنقل',
    orderItems: 'محتوى الطلب',
    itemsCount: 'مقالة',
    articlesSuffix: 'مقالة',

    // Empty states
    noInProgressOrders: 'لا طلبات جارية',
    noDeliveredOrders: 'لا توصيلات مسلّمة',

    // Profile
    driverProfile: 'بيانات السائق',
    available: 'متاح',
    unavailable: 'غير متاح',

  },
  fr: {
    // App
    appName: 'Orderium',
    tagline: 'Portail de Livraison',

    // Navigation
    myDeliveries: 'Mes Livraisons',
    profile: 'Profil',
    logout: 'Déconnexion',
    signOut: 'Se déconnecter',

    // Auth
    login: 'Connexion',
    phoneNumber: 'Numéro de téléphone',
    password: 'Mot de passe',
    enterPhoneNumber: 'Entrez le numéro',
    enterPassword: 'Entrez le mot de passe',
    phoneNumberRequired: 'Numéro requis',
    passwordRequired: 'Mot de passe requis',
    invalidCredentials: 'Identifiants invalides',
    loginFailed: 'Échec de connexion',
    welcomeBack: 'Bon retour',

    // Orders
    orders: 'Commandes',
    order: 'Commande',
    all: 'Tout',
    allOrders: 'Toutes',
    pending: 'En attente',
    assigned: 'Assigné',
    confirmed: 'Confirmé',
    pickedUp: 'Récupéré',
    toDelivery: 'À livrer',
    inDelivery: 'En livraison',
    delivered: 'Livrées',
    canceled: 'Annulées',
    deliveryStatus: 'Statut de livraison',
    total: 'Total',
    noOrdersFound: 'Aucune commande',
    noOrdersMessage: 'Aucune commande pour le moment',
    noOrdersAssigned: 'Aucune commande ne vous a été assignée',
    searchOrders: 'Rechercher par N° commande, nom client ou téléphone',

    // Filters
    filters: 'Filtres',
    enterOrderNumber: 'Entrez le N° de commande',
    enterCustomerName: 'Entrez le nom du client',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    dateRange: 'Plage de dates',
    apply: 'Appliquer',
    reset: 'Réinitialiser',

    // Date Range Picker
    period: 'Période',
    start: 'Début',
    end: 'Fin',
    selectDates: 'Sélectionner les dates',
    selectDateRange: 'Sélectionner une plage',
    predefinedPeriod: 'Période prédéfinie',
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    thisWeek: 'Cette semaine',
    lastWeek: 'Semaine dernière',
    thisMonth: 'Ce mois',
    lastMonth: 'Mois dernier',
    thisYear: 'Cette année',
    lastYear: 'Année dernière',
    ok: 'OK',

    // Pagination
    showing: 'Affichage',
    to: 'à',
    of: 'sur',
    results: 'résultats',
    perPage: 'par page',

    // Order Details
    orderNumber: 'N° Commande',
    customer: 'Client',
    customerName: 'Nom du client',
    customerPhone: 'Tél. client',
    customerAddress: 'Adresse client',
    orderSummary: 'Résumé',
    uniqueProducts: 'Produits différents',
    totalItems: 'Articles total',
    totalAmount: 'Montant total',

    // Actions
    confirmOrder: 'Confirmer',
    pickUpOrder: 'Récupérer',
    startToDelivery: 'À livrer',
    startDelivery: 'En livraison',
    markAsDelivered: 'Marquer livré',
    orderDelivered: 'Commande livrée',
    orderCanceled: 'Commande annulée',
    googleMaps: 'Google Maps',
    waze: 'Waze',
    statusUpdated: 'Statut mis à jour',
    statusUpdateFailed: 'Échec de mise à jour',

    // Status
    status: 'Statut',
    assignedStatus: 'Assignée',
    toDeliveryStatus: 'À livrer',
    inDeliveryStatus: 'En livraison',
    deliveredStatus: 'Livrée',
    canceledStatus: 'Annulée',

    // General
    loading: 'Chargement...',
    error: 'Erreur',
    retry: 'Réessayer',
    close: 'Fermer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    edit: 'Modifier',

    // Messages
    updating: 'Mise à jour...',
    updateSuccess: 'Mise à jour réussie',
    updateFailed: 'Échec de mise à jour',
    tryAgain: 'Réessayez',

    // Profile
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',

    // Language Toggle
    switchToFrench: 'Changer en français',
    switchToArabic: 'التبديل للعربية',

    // Login page UI
    deliveryPortal: 'Portail de Livraison',
    deliveryDriverAccess: 'Accès Livreur',
    loginHeroTitle: 'Sur la route,',
    loginHeroSubtitle: 'tout sous contrôle.',
    loginHeroDesc: 'Gérez vos livraisons, naviguez sur les itinéraires et confirmez les commandes en déplacement.',
    loginSignInDesc: 'Connectez-vous pour voir vos commandes assignées et démarrer votre tournée.',
    loginFeatureRoute: 'Navigation GPS',
    loginFeatureOrderMgmt: 'Gestion des Commandes',
    loginFeatureLiveTracking: 'Suivi en Direct',
    loginFeatureShift: 'Rapports de Tournée',
    dh: 'DH',
    // Notifications
    notifications: 'Notifications',
    noNotifications: 'Aucune notification',
    markAllRead: 'Tout marquer comme lu',
    allNotificationsMarkedAsRead: 'Toutes les notifications marquées comme lues',
    justNow: 'À l\'instant',
    minutesAgo: 'min',
    hoursAgo: 'h',
    daysAgo: 'j',
    'notifications.newOrder': 'Nouvelle commande',
    'notifications.orderAssigned': 'Commande assignée',
    'notifications.statusChanged': 'Mise à jour statut',
    'notifications.orderCancelled': 'Commande annulée',
    'status.to_delivery': 'À livrer',
    'status.in_delivery': 'En livraison',
    'status.delivered': 'Livrée',
    'status.canceled': 'Annulée',

    // Bottom nav tabs
    ordersTab: 'Commandes',
    inProgressTab: 'En cours',
    deliveredTab: 'Livrées',
    profileTab: 'Profil',

    // Order detail / actions
    backToOrders: 'Retour',
    callCustomer: 'Appeler',
    viewOnMaps: 'Naviguer',
    orderItems: 'Contenu de la commande',
    itemsCount: 'article',
    articlesSuffix: 'articles',

    // Empty states
    noInProgressOrders: 'Aucune livraison en cours',
    noDeliveredOrders: 'Aucune livraison effectuée',

    // Profile
    driverProfile: 'Mon Profil',
    available: 'Disponible',
    unavailable: 'Non disponible',

    // Currency
    currency: 'DH',
  },
};

export type TranslationKey = keyof typeof translations.ar;

export const formatCurrency = (amount: number, lang: Language): string => {
  if (amount === null || amount === undefined) {
    return lang === 'ar' ? '0.00 د.م' : '0.00 DH';
  }

  const formatted = amount.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (lang === 'ar') {
    return `${formatted} د.م`;
  }
  return `${formatted} DH`;
};

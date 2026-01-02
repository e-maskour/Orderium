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
    allOrders: 'جميع الطلبات',
    toDelivery: 'للتوصيل',
    inDelivery: 'قيد التوصيل',
    delivered: 'تم التوصيل',
    canceled: 'ملغي',
    noOrdersFound: 'لا توجد طلبات',
    noOrdersMessage: 'لا توجد طلبات {status} في الوقت الحالي',
    noOrdersAssigned: 'لم يتم تعيين أي طلبات لك بعد',
    searchOrders: 'ابحث برقم الطلب، اسم العميل أو رقم الهاتف',
    
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
    startDelivery: 'بدء التوصيل',
    markAsDelivered: 'تأكيد التسليم',
    googleMaps: 'خرائط جوجل',
    waze: 'ويز',
    
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
    
    // Currency
    currency: 'د.م',
    dh: 'درهم',
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
    allOrders: 'Toutes',
    toDelivery: 'À livrer',
    inDelivery: 'En livraison',
    delivered: 'Livrées',
    canceled: 'Annulées',
    noOrdersFound: 'Aucune commande',
    noOrdersMessage: 'Aucune commande {status} pour le moment',
    noOrdersAssigned: 'Aucune commande ne vous a été assignée',
    searchOrders: 'Rechercher par N° commande, nom client ou téléphone',
    
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
    startDelivery: 'Démarrer livraison',
    markAsDelivered: 'Marquer livré',
    googleMaps: 'Google Maps',
    waze: 'Waze',
    
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
    
    // Currency
    currency: 'DH',
    dh: 'DH',
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

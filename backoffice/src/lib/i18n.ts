export type Language = 'ar' | 'fr';

export const translations = {
  ar: {
    // App & Branding
    appName: 'Orderium',
    adminBackoffice: 'لوحة التحكم الإدارية',
    
    // Navigation & Dashboard
    dashboard: 'لوحة التحكم',
    welcomeBack: 'مرحباً بعودتك',
    welcome: 'مرحباً',
    
    // Auth & Login
    phoneNumber: 'رقم الهاتف',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    loggingIn: 'جاري تسجيل الدخول...',
    logout: 'تسجيل الخروج',
    invalidCredentials: 'بيانات الدخول غير صحيحة',
    enterYourPassword: 'أدخل كلمة المرور',
    
    // Delivery Persons
    deliveryPersons: 'مندوبي التوصيل',
    deliveryPerson: 'مندوب التوصيل',
    manageDeliveryPersonnel: 'إدارة مندوبي التوصيل',
    addDeliveryPerson: 'إضافة مندوب',
    editDeliveryPerson: 'تعديل مندوب',
    cancel: 'إلغاء',
    active: 'نشط',
    inactive: 'غير نشط',
    noDeliveryPersonsFound: 'لا يوجد مندوبين توصيل',
    
    // Orders
    orders: 'الطلبات',
    orderManagement: 'إدارة الطلبات',
    viewAndAssignOrders: 'عرض وتعيين الطلبات',
    orderNumber: 'رقم الطلب',
    customer: 'العميل',
    phone: 'الهاتف',
    address: 'العنوان',
    total: 'المجموع',
    status: 'الحالة',
    actions: 'الإجراءات',
    noOrdersFound: 'لا توجد طلبات',
    
    // Order Status
    unassigned: 'غير معين',
    toDelivery: 'للتوصيل',
    inDelivery: 'قيد التوصيل',
    delivered: 'تم التسليم',
    canceled: 'ملغي',
    all: 'الكل',
    
    // Date Filters
    today: 'اليوم',
    yesterday: 'أمس',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    thisYear: 'هذا العام',
    selectDate: 'اختر تاريخاً',
    
    // Form Fields
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    required: 'مطلوب',
    create: 'إنشاء',
    update: 'تحديث',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    
    // Form Validation
    passwordRequired: 'كلمة المرور مطلوبة للمندوبين الجدد',
    minSixCharacters: 'على الأقل 6 أحرف',
    
    // Actions
    assign: 'تعيين',
    unassign: 'إلغاء التعيين',
    assignTo: 'تعيين إلى',
    selectDeliveryPerson: 'اختر مندوب التوصيل',
    
    // Notifications
    deliveryPersonCreated: 'تم إنشاء مندوب التوصيل بنجاح',
    deliveryPersonUpdated: 'تم تحديث مندوب التوصيل بنجاح',
    deliveryPersonDeleted: 'تم حذف مندوب التوصيل بنجاح',
    orderAssigned: 'تم تعيين الطلب بنجاح',
    orderUnassigned: 'تم إلغاء تعيين الطلب بنجاح',
    failedToCreate: 'فشل الإنشاء',
    failedToUpdate: 'فشل التحديث',
    failedToDelete: 'فشل الحذف',
    failedToAssign: 'فشل تعيين الطلب',
    failedToUnassign: 'فشل إلغاء تعيين الطلب',
    
    // Confirmation Dialogs
    deleteDeliveryPerson: 'حذف مندوب التوصيل',
    deleteDeliveryPersonConfirm: 'هل أنت متأكد من حذف مندوب التوصيل؟ لا يمكن التراجع عن هذا الإجراء.',
    unassignOrder: 'إلغاء تعيين الطلب',
    unassignOrderConfirm: 'هل أنت متأكد من إلغاء تعيين هذا الطلب؟',
    areYouSure: 'هل أنت متأكد؟',
    actionCannotBeUndone: 'لا يمكن التراجع عن هذا الإجراء',
    
    // Search & Filter
    search: 'بحث',
    searchPlaceholder: 'ابحث برقم الطلب، اسم العميل، الهاتف، أو مندوب التوصيل...',
    filterByStatus: 'تصفية حسب الحالة',
    
    // Loading & Errors
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    
    // General
    items: 'عناصر',
    item: 'عنصر',
    close: 'إغلاق',
    back: 'رجوع',
    order: 'طلب',
    
    // Notifications
    'notifications.newOrder': 'طلب جديد',
    'notifications.orderAssigned': 'تم تعيين الطلب',
    'notifications.statusChanged': 'تم تحديث حالة الطلب',
    'notifications.orderCancelled': 'تم إلغاء الطلب',
    notifications: 'الإشعارات',
    noNotifications: 'لا توجد إشعارات',
    markAllRead: 'تعليم الكل كمقروء',
    allNotificationsMarkedAsRead: 'تم تعليم جميع الإشعارات كمقروءة',
    justNow: 'الآن',
    minutesAgo: 'د',
    hoursAgo: 'س',
    daysAgo: 'ي',
    
    // Status translations for notifications
    'status.to_delivery': 'للتوصيل',
    'status.in_delivery': 'قيد التوصيل',
    'status.delivered': 'تم التوصيل',
    'status.canceled': 'ملغي',
    
    // Currency
    currency: 'درهم',
    currencyCode: 'MAD',

    // KPIs & Statistics
    totalOrders: 'إجمالي الطلبات',
    ordersToday: 'طلبات اليوم',
    pending: 'قيد الانتظار',
    activeDeliveryPersons: 'مندوبين نشطين',
    totalRevenue: 'إجمالي الإيرادات',
    revenueToday: 'الإيرادات اليوم',
    quickAccess: 'وصول سريع',

    // POS
    pos: 'نقطة البيع',
    searchProducts: 'ابحث عن المنتجات...',
    searchByNameOrPhone: 'ابحث بالاسم أو الهاتف...',
    cart: 'السلة',
    cartEmpty: 'السلة فارغة',
    selectCustomer: 'يرجى اختيار عميل',
    newCustomer: 'عميل جديد',
    createOrder: 'إنشاء طلب',
    orderCreated: 'تم إنشاء الطلب',
    customerCreated: 'تم إنشاء العميل بنجاح',
    change: 'تغيير',
    noProductsFound: 'لا توجد منتجات',
  },
  fr: {
    // App & Branding
    appName: 'Orderium',
    adminBackoffice: 'Backoffice Admin',
    
    // Navigation & Dashboard
    dashboard: 'Tableau de bord',
    welcomeBack: 'Bon retour',
    welcome: 'Bienvenue',
    
    // Auth & Login
    phoneNumber: 'Numéro de téléphone',
    password: 'Mot de passe',
    login: 'Connexion',
    loggingIn: 'Connexion...',
    logout: 'Déconnexion',
    invalidCredentials: 'Identifiants invalides',
    enterYourPassword: 'Entrez votre mot de passe',
    
    // Delivery Persons
    deliveryPersons: 'Livreurs',
    deliveryPerson: 'Livreur',
    manageDeliveryPersonnel: 'Gérer les livreurs',
    addDeliveryPerson: 'Ajouter un livreur',
    editDeliveryPerson: 'Modifier le livreur',
    cancel: 'Annuler',
    active: 'Actif',
    inactive: 'Inactif',
    noDeliveryPersonsFound: 'Aucun livreur trouvé',
    
    // Orders
    orders: 'Commandes',
    orderManagement: 'Gestion des commandes',
    viewAndAssignOrders: 'Voir et assigner les commandes',
    orderNumber: 'N° commande',
    customer: 'Client',
    phone: 'Téléphone',
    address: 'Adresse',
    total: 'Total',
    status: 'Statut',
    actions: 'Actions',
    noOrdersFound: 'Aucune commande trouvée',
    
    // Order Status
    unassigned: 'Non assigné',
    toDelivery: 'À livrer',
    inDelivery: 'En livraison',
    delivered: 'Livré',
    canceled: 'Annulé',
    all: 'Tout',
    
    // Date Filters
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    thisWeek: 'Cette semaine',
    thisMonth: 'Ce mois',
    thisYear: 'Cette année',
    selectDate: 'Sélectionner une date',
    
    // Form Fields
    name: 'Nom',
    email: 'Email',
    required: 'Requis',
    create: 'Créer',
    update: 'Mettre à jour',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    
    // Form Validation
    passwordRequired: 'Mot de passe requis pour les nouveaux livreurs',
    minSixCharacters: 'Min. 6 caractères',
    
    // Actions
    assign: 'Assigner',
    unassign: 'Désassigner',
    assignTo: 'Assigner à',
    selectDeliveryPerson: 'Sélectionner un livreur',
    
    // Notifications
    deliveryPersonCreated: 'Livreur créé avec succès',
    deliveryPersonUpdated: 'Livreur mis à jour avec succès',
    deliveryPersonDeleted: 'Livreur supprimé avec succès',
    orderAssigned: 'Commande assignée avec succès',
    orderUnassigned: 'Commande désassignée avec succès',
    failedToCreate: 'Échec de création',
    failedToUpdate: 'Échec de mise à jour',
    failedToDelete: 'Échec de suppression',
    failedToAssign: 'Échec d\'assignation',
    failedToUnassign: 'Échec de désassignation',
    
    // Confirmation Dialogs
    deleteDeliveryPerson: 'Supprimer le livreur',
    deleteDeliveryPersonConfirm: 'Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action ne peut pas être annulée.',
    unassignOrder: 'Désassigner la commande',
    unassignOrderConfirm: 'Êtes-vous sûr de vouloir désassigner cette commande ?',
    areYouSure: 'Êtes-vous sûr ?',
    actionCannotBeUndone: 'Cette action ne peut pas être annulée',
    
    // Search & Filter
    search: 'Rechercher',
    searchPlaceholder: 'Rechercher par n° commande, client, téléphone ou livreur...',
    filterByStatus: 'Filtrer par statut',
    
    // Loading & Errors
    loading: 'Chargement...',
    error: 'Une erreur est survenue',
    
    // General
    items: 'articles',
    item: 'article',
    close: 'Fermer',
    back: 'Retour',
    order: 'Commande',
    
    // Notifications
    'notifications.newOrder': 'Nouvelle commande',
    'notifications.orderAssigned': 'Commande assignée',
    'notifications.statusChanged': 'Statut de commande mis à jour',
    'notifications.orderCancelled': 'Commande annulée',
    notifications: 'Notifications',
    noNotifications: 'Aucune notification',
    markAllRead: 'Tout marquer comme lu',
    allNotificationsMarkedAsRead: 'Toutes les notifications marquées comme lues',
    justNow: 'À l\'instant',
    minutesAgo: 'min',
    hoursAgo: 'h',
    daysAgo: 'j',
    
    // Status translations for notifications
    'status.to_delivery': 'À livrer',
    'status.in_delivery': 'En livraison',
    'status.delivered': 'Livré',
    'status.canceled': 'Annulé',
    
    // Currency
    currency: 'DH',
    currencyCode: 'MAD',

    // KPIs & Statistics
    totalOrders: 'Total des commandes',
    ordersToday: 'Commandes aujourd\'hui',
    pending: 'En attente',
    activeDeliveryPersons: 'Livreurs actifs',
    totalRevenue: 'Revenu total',
    revenueToday: 'Revenu aujourd\'hui',
    quickAccess: 'Accès rapide',

    // POS
    pos: 'Point de vente',
    searchProducts: 'Rechercher des produits...',
    searchByNameOrPhone: 'Rechercher par nom ou téléphone...',
    cart: 'Panier',
    cartEmpty: 'Le panier est vide',
    selectCustomer: 'Veuillez sélectionner un client',
    newCustomer: 'Nouveau client',
    createOrder: 'Créer une commande',
    orderCreated: 'Commande créée',
    customerCreated: 'Client créé avec succès',
    change: 'Changer',
    noProductsFound: 'Aucun produit trouvé',
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

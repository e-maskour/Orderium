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
    deliveryPerson: 'مندوب التوصيل',
    actions: 'الإجراءات',
    noOrdersFound: 'لا توجد طلبات',
    
    // Order Status
    unassigned: 'غير معين',
    toDelivery: 'للتوصيل',
    inDelivery: 'قيد التوصيل',
    delivered: 'تم التسليم',
    canceled: 'ملغي',
    all: 'الكل',
    
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
    
    // Currency
    currency: 'درهم',
    currencyCode: 'MAD',
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
    deliveryPerson: 'Livreur',
    actions: 'Actions',
    noOrdersFound: 'Aucune commande trouvée',
    
    // Order Status
    unassigned: 'Non assigné',
    toDelivery: 'À livrer',
    inDelivery: 'En livraison',
    delivered: 'Livré',
    canceled: 'Annulé',
    all: 'Tout',
    
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
    
    // Currency
    currency: 'DH',
    currencyCode: 'MAD',
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

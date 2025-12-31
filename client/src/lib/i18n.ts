export type Language = 'ar' | 'fr';

export const translations = {
  ar: {
    // App
    appName: 'المتجر',
    tagline: 'مرحباً بكم',
    
    // Navigation
    home: 'الرئيسية',
    menu: 'القائمة',
    cart: 'السلة',
    orders: 'الطلبات',
    
    // Categories
    allProducts: 'جميع المنتجات',
    products: 'المنتجات',
    services: 'الخدمات',
    
    // Product
    addToCart: 'أضف للسلة',
    outOfStock: 'غير متوفر',
    description: 'الوصف',
    price: 'السعر',
    
    // Cart
    yourCart: 'سلتك',
    emptyCart: 'سلتك فارغة',
    emptyCartMessage: 'أضف بعض المنتجات للبدء',
    continueShopping: 'تابع التسوق',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    total: 'المجموع',
    checkout: 'إتمام الطلب',
    clearCart: 'إفراغ السلة',
    items: 'عناصر',
    item: 'عنصر',
    
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
    city: 'المدينة',
    cityPlaceholder: 'اختر مدينتك',
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
    search: 'بحث...',
    searchProducts: 'ابحث عن المنتجات',
    noResults: 'لا توجد نتائج',
    
    // General
    currency: 'درهم',
    currencyCode: 'MAD',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    back: 'رجوع',
    close: 'إغلاق',
    
    // Cities
    casablanca: 'الدار البيضاء',
    rabat: 'الرباط',
    marrakech: 'مراكش',
    fes: 'فاس',
    tangier: 'طنجة',
    agadir: 'أكادير',
    meknes: 'مكناس',
    oujda: 'وجدة',
    kenitra: 'القنيطرة',
    tetouan: 'تطوان',
  },
  fr: {
    // App
    appName: 'La Boutique',
    tagline: 'Bienvenue',
    
    // Navigation
    home: 'Accueil',
    menu: 'Menu',
    cart: 'Panier',
    orders: 'Commandes',
    
    // Categories
    allProducts: 'Tous les produits',
    products: 'Produits',
    services: 'Services',
    
    // Product
    addToCart: 'Ajouter au panier',
    outOfStock: 'Rupture de stock',
    description: 'Description',
    price: 'Prix',
    
    // Cart
    yourCart: 'Votre panier',
    emptyCart: 'Votre panier est vide',
    emptyCartMessage: 'Ajoutez des produits pour commencer',
    continueShopping: 'Continuer vos achats',
    subtotal: 'Sous-total',
    discount: 'Remise',
    total: 'Total',
    checkout: 'Commander',
    clearCart: 'Vider le panier',
    items: 'articles',
    item: 'article',
    
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
    city: 'Ville',
    cityPlaceholder: 'Choisissez votre ville',
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
    search: 'Rechercher...',
    searchProducts: 'Rechercher des produits',
    noResults: 'Aucun résultat',
    
    // General
    currency: 'DH',
    currencyCode: 'MAD',
    loading: 'Chargement...',
    error: 'Une erreur est survenue',
    retry: 'Réessayer',
    back: 'Retour',
    close: 'Fermer',
    
    // Cities
    casablanca: 'Casablanca',
    rabat: 'Rabat',
    marrakech: 'Marrakech',
    fes: 'Fès',
    tangier: 'Tanger',
    agadir: 'Agadir',
    meknes: 'Meknès',
    oujda: 'Oujda',
    kenitra: 'Kénitra',
    tetouan: 'Tétouan',
  },
};

export type TranslationKey = keyof typeof translations.ar;

export const moroccanCities = [
  { id: 'casablanca', ar: 'الدار البيضاء', fr: 'Casablanca' },
  { id: 'rabat', ar: 'الرباط', fr: 'Rabat' },
  { id: 'marrakech', ar: 'مراكش', fr: 'Marrakech' },
  { id: 'fes', ar: 'فاس', fr: 'Fès' },
  { id: 'tangier', ar: 'طنجة', fr: 'Tanger' },
  { id: 'agadir', ar: 'أكادير', fr: 'Agadir' },
  { id: 'meknes', ar: 'مكناس', fr: 'Meknès' },
  { id: 'oujda', ar: 'وجدة', fr: 'Oujda' },
  { id: 'kenitra', ar: 'القنيطرة', fr: 'Kénitra' },
  { id: 'tetouan', ar: 'تطوان', fr: 'Tétouan' },
];

export const formatCurrency = (amount: number, lang: Language): string => {
  const formatted = amount.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  if (lang === 'ar') {
    return `${formatted} درهم`;
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

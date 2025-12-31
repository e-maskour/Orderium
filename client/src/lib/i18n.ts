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

// ============================================================
// @orderium/ui - Theme Configuration
// ============================================================
//
// PrimeReact v10 Theming Architecture
// ------------------------------------
// This package uses PrimeReact v10's CSS-based theming model.
// The `definePreset()` design-token API is a PrimeReact v4/v5 feature
// and does NOT exist in v10.
//
// How theming works in this monorepo:
//   1. src/styles.css imports the base lara-light-amber CSS theme.
//   2. src/styles.css then overrides all PrimeReact component colors
//      using CSS custom properties (var(--primary-color), var(--primary-NNN)).
//   3. Each app imports @orderium/ui/styles.css first, then its own theme.css
//      which sets its specific primary color palette.
//   4. Import order guarantees per-app isolation with no cross-app leakage.
//
// App color assignments:
//   backoffice:      Blue    #235ae4  →  backoffice/src/theme.css
//   client:          Emerald #059669  →  client/src/theme.css
//   delivery-portal: Orange  #df7817  →  delivery-portal/src/theme.css
//   tenant-dashboard: Indigo #4f46e5  →  Tailwind only (no PrimeReact)
//
// Each app also has a src/theme-preset.ts which exports its specific
// PrimeReact provider config and documents the brand token palette.

/**
 * Base Orderium PrimeReact configuration.
 * Each app extends this via its own theme-preset.ts.
 * Pass to: <PrimeReactProvider value={appConfig}>
 */
export const orderiumPrimeConfig = {
    ripple: true,
    inputStyle: 'outlined' as const,
    zIndex: {
        modal: 10100,
        overlay: 10000,
        menu: 10000,
        tooltip: 10100,
        toast: 10200,
    },
};

/**
 * Arabic locale for PrimeReact components.
 */
export const arabicLocale = {
    startsWith: 'يبدأ بـ',
    contains: 'يحتوي على',
    notContains: 'لا يحتوي على',
    endsWith: 'ينتهي بـ',
    equals: 'يساوي',
    notEquals: 'لا يساوي',
    noFilter: 'بدون فلتر',
    lt: 'أقل من',
    lte: 'أقل من أو يساوي',
    gt: 'أكبر من',
    gte: 'أكبر من أو يساوي',
    dateIs: 'التاريخ هو',
    dateIsNot: 'التاريخ ليس',
    dateBefore: 'التاريخ قبل',
    dateAfter: 'التاريخ بعد',
    clear: 'مسح',
    apply: 'تطبيق',
    matchAll: 'تطابق الكل',
    matchAny: 'تطابق أي',
    addRule: 'إضافة قاعدة',
    removeRule: 'حذف قاعدة',
    accept: 'نعم',
    reject: 'لا',
    choose: 'اختر',
    upload: 'رفع',
    cancel: 'إلغاء',
    dayNames: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    dayNamesShort: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
    dayNamesMin: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
    monthNames: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    monthNamesShort: ['ين', 'فب', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
    today: 'اليوم',
    weekHeader: 'أسبوع',
    firstDayOfWeek: 6,
    dateFormat: 'dd/mm/yy',
    weak: 'ضعيف',
    medium: 'متوسط',
    strong: 'قوي',
    passwordPrompt: 'أدخل كلمة المرور',
    emptyMessage: 'لا توجد نتائج',
    emptyFilterMessage: 'لا توجد نتائج',
    searchMessage: '{0} نتائج متاحة',
    selectionMessage: '{0} عناصر محددة',
    emptySelectionMessage: 'لم يتم اختيار أي عنصر',
    emptySearchMessage: 'لا توجد نتائج',
    fileSizeTypes: ['بايت', 'ك.ب', 'م.ب', 'ج.ب', 'ت.ب', 'ب.ب', 'إ.ب', 'ز.ب', 'ي.ب'],
    aria: {
        trueLabel: 'صحيح',
        falseLabel: 'خطأ',
        nullLabel: 'غير محدد',
        star: '1 نجمة',
        stars: '{star} نجوم',
        selectAll: 'تحديد الكل',
        unselectAll: 'إلغاء تحديد الكل',
        close: 'إغلاق',
        previous: 'السابق',
        next: 'التالي',
        navigation: 'التنقل',
        scrollTop: 'انتقل للأعلى',
        moveUp: 'نقل للأعلى',
        moveTop: 'نقل للبداية',
        moveDown: 'نقل للأسفل',
        moveBottom: 'نقل للنهاية',
        moveToTarget: 'نقل للهدف',
        moveToSource: 'نقل للمصدر',
        moveAllToTarget: 'نقل الكل للهدف',
        moveAllToSource: 'نقل الكل للمصدر',
        pageLabel: 'صفحة {page}',
        firstPageLabel: 'الصفحة الأولى',
        lastPageLabel: 'الصفحة الأخيرة',
        nextPageLabel: 'الصفحة التالية',
        prevPageLabel: 'الصفحة السابقة',
        rowsPerPageLabel: 'صفوف لكل صفحة',
        jumpToPageDropdownLabel: 'القائمة المنسدلة للانتقال إلى الصفحة',
        jumpToPageInputLabel: 'إدخال الانتقال إلى الصفحة',
        selectRow: 'تحديد الصف',
        unselectRow: 'إلغاء تحديد الصف',
        expandRow: 'توسيع الصف',
        collapseRow: 'طي الصف',
        showFilterMenu: 'إظهار قائمة الفلتر',
        hideFilterMenu: 'إخفاء قائمة الفلتر',
        filterOperator: 'عامل الفلتر',
        filterConstraint: 'قيد الفلتر',
        editRow: 'تعديل الصف',
        saveEdit: 'حفظ التعديل',
        cancelEdit: 'إلغاء التعديل',
        listView: 'عرض القائمة',
        gridView: 'عرض الشبكة',
        slide: 'شريحة',
        slideNumber: '{slideNumber}',
        zoomImage: 'تكبير الصورة',
        zoomIn: 'تكبير',
        zoomOut: 'تصغير',
        rotateRight: 'تدوير لليمين',
        rotateLeft: 'تدوير لليسار',
    },
};

/**
 * French locale for PrimeReact components.
 */
export const frenchLocale = {
    startsWith: 'Commence par',
    contains: 'Contient',
    notContains: 'Ne contient pas',
    endsWith: 'Se termine par',
    equals: 'Égal à',
    notEquals: 'Différent de',
    noFilter: 'Aucun filtre',
    lt: 'Inférieur à',
    lte: 'Inférieur ou égal à',
    gt: 'Supérieur à',
    gte: 'Supérieur ou égal à',
    dateIs: 'La date est',
    dateIsNot: "La date n'est pas",
    dateBefore: 'La date est avant',
    dateAfter: 'La date est après',
    clear: 'Effacer',
    apply: 'Appliquer',
    matchAll: 'Correspondre à tous',
    matchAny: "Correspondre à n'importe lequel",
    addRule: 'Ajouter une règle',
    removeRule: 'Supprimer la règle',
    accept: 'Oui',
    reject: 'Non',
    choose: 'Choisir',
    upload: 'Téléverser',
    cancel: 'Annuler',
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    dayNamesMin: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
    monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    monthNamesShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    today: "Aujourd'hui",
    weekHeader: 'Sem',
    firstDayOfWeek: 1,
    dateFormat: 'dd/mm/yy',
    weak: 'Faible',
    medium: 'Moyen',
    strong: 'Fort',
    passwordPrompt: 'Entrez un mot de passe',
    emptyMessage: 'Aucun résultat',
    emptyFilterMessage: 'Aucun résultat',
    searchMessage: '{0} résultats disponibles',
    selectionMessage: '{0} éléments sélectionnés',
    emptySelectionMessage: 'Aucun élément sélectionné',
    emptySearchMessage: 'Aucun résultat trouvé',
    fileSizeTypes: ['o', 'Ko', 'Mo', 'Go', 'To', 'Po', 'Eo', 'Zo', 'Yo'],
    aria: {
        trueLabel: 'Vrai',
        falseLabel: 'Faux',
        nullLabel: 'Non sélectionné',
        star: '1 étoile',
        stars: '{star} étoiles',
        selectAll: 'Tout sélectionner',
        unselectAll: 'Tout désélectionner',
        close: 'Fermer',
        previous: 'Précédent',
        next: 'Suivant',
        navigation: 'Navigation',
        scrollTop: 'Défiler vers le haut',
        moveUp: 'Déplacer vers le haut',
        moveTop: 'Déplacer en haut',
        moveDown: 'Déplacer vers le bas',
        moveBottom: 'Déplacer en bas',
        moveToTarget: 'Déplacer vers la cible',
        moveToSource: 'Déplacer vers la source',
        moveAllToTarget: 'Tout déplacer vers la cible',
        moveAllToSource: 'Tout déplacer vers la source',
        pageLabel: 'Page {page}',
        firstPageLabel: 'Première page',
        lastPageLabel: 'Dernière page',
        nextPageLabel: 'Page suivante',
        prevPageLabel: 'Page précédente',
        rowsPerPageLabel: 'Lignes par page',
        jumpToPageDropdownLabel: 'Menu déroulant de saut de page',
        jumpToPageInputLabel: 'Saisie de saut de page',
        selectRow: 'Sélectionner la ligne',
        unselectRow: 'Désélectionner la ligne',
        expandRow: 'Développer la ligne',
        collapseRow: 'Réduire la ligne',
        showFilterMenu: 'Afficher le menu de filtre',
        hideFilterMenu: 'Masquer le menu de filtre',
        filterOperator: 'Opérateur de filtre',
        filterConstraint: 'Contrainte de filtre',
        editRow: 'Modifier la ligne',
        saveEdit: "Enregistrer la modification",
        cancelEdit: "Annuler la modification",
        listView: 'Vue liste',
        gridView: 'Vue grille',
        slide: 'Diapositive',
        slideNumber: '{slideNumber}',
        zoomImage: "Zoomer l'image",
        zoomIn: 'Zoom avant',
        zoomOut: 'Zoom arrière',
        rotateRight: 'Tourner à droite',
        rotateLeft: 'Tourner à gauche',
    },
};

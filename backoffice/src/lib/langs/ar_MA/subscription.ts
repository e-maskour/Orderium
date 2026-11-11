export default {
  // ─── Subscription / plan ──────────────────────────────────
  mySubscription: 'اشتراكي',
  subscriptionSubtitle: 'باقتك والوحدات المضمنة واستهلاكك',
  subscriptionCurrentPlan: 'الباقة الحالية',
  subscriptionStatus: 'الحالة',
  subscriptionStatus_trial: 'فترة تجريبية',
  subscriptionStatus_active: 'نشط',
  subscriptionStatus_expired: 'منتهي',
  subscriptionStatus_suspended: 'موقوف',
  subscriptionStatus_disabled: 'معطل',
  subscriptionTrialEndsOn: 'نهاية الفترة التجريبية',
  subscriptionRenewsOn: 'التجديد',
  subscriptionNoEndDate: 'بدون تاريخ انتهاء',
  subscriptionFeatures: 'وحدات باقتك',
  subscriptionFeature_pos: 'نقطة البيع والصندوق',
  subscriptionFeature_delivery: 'عمال التوصيل وبوابة التوصيل',
  subscriptionFeature_client_portal: 'بوابة العملاء (الطلبات عبر الإنترنت)',
  subscriptionFeature_reports: 'التقارير المتقدمة والتصدير',
  subscriptionIncluded: 'مضمن',
  subscriptionNotIncluded: 'غير مضمن',
  subscriptionUsage: 'الاستهلاك',
  subscriptionLimit_users: 'المستخدمون',
  subscriptionLimit_products: 'المنتجات',
  subscriptionLimit_warehouses: 'المستودعات',
  subscriptionLimit_deliveryPersons: 'عمال التوصيل',
  subscriptionLimit_ordersPerMonth: 'طلبات هذا الشهر',
  subscriptionLimit_storageMb: 'التخزين',
  subscriptionUnlimited: 'غير محدود',
  subscriptionLimitNear: 'الحد يقترب',
  subscriptionLimitReached: 'تم بلوغ الحد',
  subscriptionUnitMb: 'ميغابايت',
  subscriptionUnitGb: 'غيغابايت',
  subscriptionChangePlan: 'تغيير الباقة',
  subscriptionChangePlanHint: 'اختر الباقة التي تريدها: سيتواصل معك فريقنا عبر واتساب لتفعيلها.',
  subscriptionWantedPlan: 'الباقة المطلوبة',
  subscriptionWhatsAppMessage:
    'مرحبا، أرغب في تغيير باقة Marnova.\nالشركة: {tenant}\nالباقة الحالية: {current}\nالباقة المطلوبة: {wanted}',
  subscriptionLoadError: 'تعذر تحميل معلومات الاشتراك.',
  subscriptionRetry: 'إعادة المحاولة',

  // ─── Plan-locked screens & errors ─────────────────────────
  planLockedBadge: 'غير مضمن في باقتك',
  planLockedTitle: 'هذه الوحدة غير مضمنة في باقتك',
  planLockedBody_pos:
    'نقطة البيع غير متاحة في اشتراكك الحالي. انتقل إلى باقة أعلى لتسجيل مبيعاتك في المتجر.',
  planLockedBody_caisse:
    'الصندوق غير متاح في اشتراكك الحالي. انتقل إلى باقة أعلى لمتابعة عمليات التحصيل.',
  planLockedBody_reports:
    'التقارير المتقدمة والتصدير غير مضمنة في اشتراكك الحالي. تبقى لوحة القيادة متاحة.',
  planLockedBody_delivery:
    'إدارة عمال التوصيل غير مضمنة في اشتراكك الحالي. انتقل إلى باقة أعلى لتنظيم عمليات التوصيل.',
  planLockedBody_clientRequests:
    'بوابة العملاء غير مضمنة في اشتراكك الحالي. انتقل إلى باقة Pro لاستقبال تسجيلات وطلبات عملائك عبر الإنترنت.',
  planSeeSubscription: 'عرض اشتراكي',
  planErrorSeeSubscription: 'عرض اشتراكي ←',
  planErrorLimitFallback: 'تم بلوغ حد اشتراكك.',
  planErrorFeatureFallback: 'هذه الميزة غير مضمنة في اشتراكك.',

  // ─── Plan limit reached (create screens) ──────────────────
  planLimitBadge: 'تم بلوغ الحد',
  planLimitTitle: 'لقد بلغت حد باقتك',
  planLimitBody:
    'باقتك {plan} تسمح بـ {limit} {unit} كحد أقصى ولديك حاليا {used}. غيّر باقتك لمواصلة الإضافة.',
  planLimitBodyNone: 'باقتك {plan} لا تتضمن {unit}. غيّر باقتك لإضافتهم.',
  planLimitBodyStorage:
    'باقتك {plan} تتضمن {limit} من مساحة التخزين وتستعمل حاليا {used}. غيّر باقتك لإضافة ملفات.',
  planLimitBodyOrders:
    'باقتك {plan} تسمح بـ {limit} طلبية في الشهر وقد أنشأت {used} هذا الشهر. غيّر باقتك لمواصلة إنشاء الطلبيات.',
  planLimitUnit_users: 'مستخدمين',
  planLimitUnit_products: 'منتجات',
  planLimitUnit_warehouses: 'مستودعات',
  planLimitUnit_deliveryPersons: 'عمال توصيل',
  planLimitUnit_ordersPerMonth: 'طلبيات في الشهر',
  planLimitUnit_storageMb: 'مساحة التخزين',
  planLimitUsage: '{used} / {limit}',
  planLimitChangePlan: 'تغيير الباقة',
  planLimitBack: 'رجوع',
  planLimitClose: 'إغلاق',
  planLimitKeepWorking: 'باقي فضائك يبقى متاحا: يمكنك الاطلاع على بياناتك وتعديلها.',
};

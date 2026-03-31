export default {
  // Page
  notifications: 'الإشعارات',
  notificationsSubtitle: 'ابقَ على اطلاع بكل ما يحدث',
  markAllRead: 'تحديد الكل كمقروء',
  allNotificationsMarkedAsRead: 'تم تحديد جميع الإشعارات كمقروءة',
  searchNotifications: 'ابحث في الإشعارات...',

  // Tabs
  tabAll: 'الكل',
  tabUnread: 'غير مقروء',
  tabOrders: 'الطلبات',
  tabStock: 'المخزون',
  tabPayments: 'المدفوعات',
  tabTeam: 'الفريق',

  // Empty state
  emptyTitle: 'لا توجد إشعارات',
  emptySubtitle: 'أنت محدّث! ستظهر هنا كل المستجدات.',

  // Priority labels
  priorityCritical: 'عاجل',
  priorityHigh: 'مهم',
  priorityMedium: 'معلومة',
  priorityLow: 'تذكير',

  // Notification type titles
  'notification.title.new_order': 'طلب جديد',
  'notification.title.order_cancelled': 'إلغاء الطلب',
  'notification.title.order_delivered': 'تم توصيل الطلب',
  'notification.title.low_stock': 'مخزون منخفض',
  'notification.title.out_of_stock': 'نفاد المخزون',
  'notification.title.payment_received': 'تم استلام الدفعة',
  'notification.title.payment_failed': 'فشل الدفع',
  'notification.title.new_user': 'عضو جديد',
  'notification.title.user_deactivated': 'تعطيل الحساب',
  'notification.title.system_update': 'تحديث متاح',
  'notification.title.backup_done': 'اكتمال النسخ الاحتياطي',
  'notification.title.order_assigned': 'تم تعيين الطلب',
  'notification.title.order_status_changed': 'تحديث حالة الطلب',
  'notification.title.delivery_status_update': 'تحديث حالة التوصيل',
  'notification.title.system': 'تنبيه النظام',
  'notification.title.info': 'معلومات',
  'notification.title.warning': 'تحذير',
  'notification.title.error': 'خطأ',

  // Notification type messages (with interpolation)
  'notification.message.new_order': 'تم استلام الطلب {{reference}} من {{client}} بمبلغ {{amount}}',
  'notification.message.order_cancelled': 'تم إلغاء الطلب {{reference}} من طرف {{client}}',
  'notification.message.order_delivered': 'تم توصيل الطلب {{reference}} بنجاح',
  'notification.message.low_stock': 'المنتج {{product}} مخزونه منخفض: {{quantity}} متبقي',
  'notification.message.out_of_stock': 'المنتج {{product}} نفد من المخزون',
  'notification.message.payment_received': 'تم استلام دفعة {{amount}} للطلب {{reference}}',
  'notification.message.payment_failed': 'فشل الدفع للطلب {{reference}}',
  'notification.message.new_user': 'انضم {{name}} إلى الفريق بصفة {{role}}',
  'notification.message.user_deactivated': 'تم تعطيل حساب {{name}}',
  'notification.message.system_update': 'الإصدار {{version}} من Morocom متاح',
  'notification.message.backup_done': 'تم النسخ الاحتياطي التلقائي في {{date}}',
  'notification.message.order_assigned': 'تم تعيين الطلب {{orderNumber}} لك',
  'notification.message.order_status_changed': 'تم تحديث حالة الطلب {{orderNumber}} إلى {{status}}',
  'notification.message.delivery_status_update': 'تحديث التوصيل للطلب {{orderNumber}}: {{status}}',
  'notification.message.system': '{{message}}',

  // Relative time
  justNow: 'الآن',
  minutesAgo: 'منذ {{count}} دقيقة',
  hoursAgo: 'منذ {{count}} ساعة',
  daysAgo: 'منذ {{count}} يوم',

  // Actions
  actionView: 'عرض',
  actionDismiss: 'تجاهل',
  viewAllNotifications: 'عرض كل الإشعارات',
  notificationSettings: 'إعدادات الإشعارات',
  markAsRead: 'تحديد كمقروء',
  notificationDismissed: 'تم حذف الإشعار',

  // Date groups
  dateToday: 'اليوم',
  dateYesterday: 'أمس',
  dateThisWeek: 'هذا الأسبوع',
  dateOlder: 'أقدم',

  // Settings page
  settingsTitle: 'إعدادات الإشعارات',
  settingsSubtitle: 'اختر كيف تريد أن يتم إشعارك',
  channelInApp: 'في التطبيق',
  channelEmail: 'بالبريد الإلكتروني',
  channelSms: 'برسالة نصية',
  categoryOrders: 'الطلبات',
  categoryStock: 'المخزون',
  categoryPayments: 'المدفوعات',
  categoryTeam: 'الفريق',
  categorySystem: 'النظام',
  criticalCannotDisable: 'لا يمكن تعطيل الإشعارات العاجلة في التطبيق',
  settingsSaved: 'تم حفظ الإعدادات',

  // Status translations
  'status.to_delivery': 'للتوصيل',
  'status.in_delivery': 'قيد التوصيل',
  'status.delivered': 'تم التوصيل',
  'status.canceled': 'ملغي',

  // Bulk/misc
  deleteNotifications: 'حذف الإشعارات',
  confirmDeleteMessage: 'هل أنت متأكد من حذف {{count}} إشعار؟ لا يمكن التراجع عن هذا الإجراء.',
  notificationsMarkedAsRead: '{{count}} إشعارات تم تحديدها كمقروءة',
  notificationsDeleted: '{{count}} إشعارات تم حذفها',
  notifyWhenSomethingHappens: 'سنخبرك عندما يحدث شيء ما',
};

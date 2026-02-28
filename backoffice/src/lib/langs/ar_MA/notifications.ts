export default {
  // Notifications Page
  notifications: 'الإشعارات',
  noNotifications: 'لا توجد إشعارات',
  markAllRead: 'تعليم الكل كمقروء',
  allNotificationsMarkedAsRead: 'تم تعليم جميع الإشعارات كمقروءة',
  manageNotifications: 'إدارة الإشعارات والتنبيهات',
  allNotifications: 'جميع الإشعارات',
  viewAndManageHistory: 'عرض وإدارة سجل الإشعارات',
  searchNotifications: 'البحث في الإشعارات...',
  allTypes: 'جميع الأنواع',
  allPriority: 'جميع الأولويات',
  selected: 'محدد',
  markAsRead: 'تعليم كمقروء',
  archive: 'أرشفة',
  delete: 'حذف',
  unread: 'غير مقروء',
  all: 'الكل',
  archived: 'مؤرشف',
  noNotificationsFound: 'لم يتم العثور على إشعارات',
  allCaughtUp: 'لقد اطلعت على كل شيء!',
  tryAdjustingFilters: 'حاول تعديل الفلاتر',
  selectAll: 'تحديد الكل',
  showing: 'عرض',
  to: 'إلى',
  of: 'من',
  results: 'نتيجة',
  page: 'صفحة',
  previous: 'السابق',
  next: 'التالي',
  
  // Stats Cards
  totalNotifications: 'مجموع الإشعارات',
  today: 'اليوم',
  thisWeek: 'هذا الأسبوع',
  
  // INotification Types
  newOrders: 'طلبات جديدة',
  assigned: 'معينة',
  statusChanged: 'تم تغيير الحالة',
  payments: 'المدفوعات',
  
  // Priority Levels
  urgent: 'عاجل',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
  
  // INotification Titles (Translation Keys)
  'notification.title.new_order': '🛒 طلب جديد',
  'notification.title.order_assigned': '👤 تم تعيين الطلب',
  'notification.title.order_status_changed': '📦 تحديث حالة الطلب',
  'notification.title.delivery_status_update': '🚚 تحديث حالة التوصيل',
  'notification.title.order_cancelled': '❌ إلغاء الطلب',
  'notification.title.payment_received': '💰 تم استلام الدفعة',
  'notification.title.low_stock': '⚠️ مخزون منخفض',
  'notification.title.system': '⚙️ تنبيه النظام',
  'notification.title.info': 'ℹ️ معلومات',
  'notification.title.warning': '⚠️ تحذير',
  'notification.title.error': '🚨 خطأ',
  
  // INotification Messages (Translation Keys with placeholders)
  'notification.message.new_order': 'تم استلام الطلب رقم {{orderNumber}} من {{customerName}}',
  'notification.message.order_assigned': 'تم تعيين الطلب {{orderNumber}} لك',
  'notification.message.order_status_changed': 'تم تحديث حالة الطلب {{orderNumber}} إلى {{status}}',
  'notification.message.delivery_status_update': 'تحديث التوصيل للطلب {{orderNumber}}: {{status}}',
  'notification.message.order_cancelled': 'تم إلغاء الطلب {{orderNumber}}',
  'notification.message.payment_received': 'تم استلام دفعة {{amount}} للطلب {{orderNumber}}',
  'notification.message.low_stock': 'المنتج {{productName}} وصل إلى مخزون منخفض: {{quantity}} متبقي',
  'notification.message.system': '{{message}}',
  
  // Time Indicators
  justNow: 'الآن',
  minutesAgo: 'د',
  hoursAgo: 'س',
  daysAgo: 'ي',
  
  // Status translations
  'status.to_delivery': 'للتوصيل',
  'status.in_delivery': 'قيد التوصيل',
  'status.delivered': 'تم التوصيل',
  'status.canceled': 'ملغي',
  
  // Confirm Dialog
  deleteNotifications: 'حذف الإشعارات',
  confirmDeleteMessage: 'هل أنت متأكد من حذف {{count}} إشعار؟ لا يمكن التراجع عن هذا الإجراء.',
  notificationsMarkedAsRead: '{{count}} إشعارات تم تعليمها كمقروءة',
  notificationArchived: 'تم أرشفة الإشعار',
  notificationsArchived: '{{count}} إشعارات تم أرشفتها',
  notificationsDeleted: '{{count}} إشعارات تم حذفها',
  notifyWhenSomethingHappens: 'سنخبرك عندما يحدث شيء ما',
};

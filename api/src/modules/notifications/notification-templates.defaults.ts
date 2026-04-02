/**
 * Default notification dictionary.
 * These are seeded into the DB on first run and can be edited by admin.
 * Template variables: {{clientName}}, {{orderId}}, {{orderNumber}},
 * {{driverName}}, {{productName}}, {{amount}}, {{dueDate}}, {{count}}, {{days}}
 */
export interface NotificationTemplateDefault {
  key: string;
  category: string;
  portal: string;
  titleFr: string;
  bodyFr: string;
  titleAr: string;
  bodyAr: string;
  description: string;
  priority: string;
  enabled: boolean;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplateDefault[] = [
  // ─── Clients → Backoffice ───────────────────────────────────────────────────
  {
    key: 'CLIENT_REGISTERED',
    category: 'clients',
    portal: 'backoffice',
    titleFr: 'Nouveau client inscrit',
    bodyFr: '{{clientName}} vient de créer un compte.',
    titleAr: 'عميل جديد',
    bodyAr: 'قام {{clientName}} بإنشاء حساب جديد.',
    description: 'Envoyé aux admins quand un client crée un compte.',
    priority: 'MEDIUM',
    enabled: true,
  },
  {
    key: 'ORDER_PLACED',
    category: 'orders',
    portal: 'backoffice',
    titleFr: 'Nouvelle commande',
    bodyFr: '🛒 Commande #{{orderNumber}} reçue de {{clientName}}.',
    titleAr: 'طلب جديد',
    bodyAr: '🛒 تم استقبال طلب #{{orderNumber}} من {{clientName}}.',
    description: 'Envoyé aux admins quand un client passe une commande.',
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'ORDER_CANCELLED_BY_CLIENT',
    category: 'orders',
    portal: 'backoffice',
    titleFr: 'Commande annulée par le client',
    bodyFr: 'Le client {{clientName}} a annulé la commande #{{orderNumber}}.',
    titleAr: 'إلغاء الطلب من العميل',
    bodyAr: 'قام {{clientName}} بإلغاء الطلب #{{orderNumber}}.',
    description: 'Envoyé aux admins quand un client annule sa commande.',
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'CLIENT_PROFILE_UPDATED',
    category: 'clients',
    portal: 'backoffice',
    titleFr: 'Profil client modifié',
    bodyFr: '{{clientName}} a mis à jour son profil ou adresse.',
    titleAr: 'تحديث ملف العميل',
    bodyAr: 'قام {{clientName}} بتحديث ملفه الشخصي أو عنوانه.',
    description: 'Envoyé aux admins quand un client met à jour son profil.',
    priority: 'LOW',
    enabled: true,
  },
  {
    key: 'CLIENT_COMPLAINT',
    category: 'clients',
    portal: 'backoffice',
    titleFr: 'Avis / réclamation client',
    bodyFr: '{{clientName}} a laissé un avis ou une réclamation.',
    titleAr: 'تقييم أو شكوى',
    bodyAr: 'قدّم {{clientName}} تقييمًا أو شكوى.',
    description: 'Envoyé aux admins quand un client soumet une réclamation.',
    priority: 'MEDIUM',
    enabled: true,
  },

  // ─── Admin → Delivery Portal ────────────────────────────────────────────────
  {
    key: 'ORDER_ASSIGNED_DRIVER',
    category: 'delivery',
    portal: 'delivery',
    titleFr: 'Nouvelle assignation',
    bodyFr:
      '🚚 Commande #{{orderNumber}} vous a été assignée. Client: {{clientName}}.',
    titleAr: 'تكليف جديد',
    bodyAr: '🚚 تم تكليفك بالطلب #{{orderNumber}}. العميل: {{clientName}}.',
    description: "Envoyé au livreur quand l'admin lui assigne une commande.",
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'ORDER_REASSIGNED_DRIVER',
    category: 'delivery',
    portal: 'delivery',
    titleFr: 'Commande réassignée',
    bodyFr: '🔄 La commande #{{orderNumber}} vous a été réassignée.',
    titleAr: 'إعادة تكليف الطلب',
    bodyAr: '🔄 تمت إعادة تكليفك بالطلب #{{orderNumber}}.',
    description:
      "Envoyé au nouveau livreur quand l'admin réassigne une commande.",
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'ORDER_CANCELLED_BY_ADMIN_DRIVER',
    category: 'delivery',
    portal: 'delivery',
    titleFr: 'Commande annulée',
    bodyFr:
      '❌ La commande #{{orderNumber}} qui vous était assignée a été annulée.',
    titleAr: 'تم إلغاء الطلب',
    bodyAr: '❌ تم إلغاء الطلب #{{orderNumber}} المكلّف إليك.',
    description:
      "Envoyé au livreur quand l'admin annule une commande assignée.",
    priority: 'HIGH',
    enabled: true,
  },

  // ─── Admin → Client Portal ──────────────────────────────────────────────────
  {
    key: 'ORDER_DELIVERED_CLIENT',
    category: 'orders',
    portal: 'client',
    titleFr: 'Commande livrée',
    bodyFr: '✅ Votre commande #{{orderNumber}} a été livrée.',
    titleAr: 'تم توصيل طلبك',
    bodyAr: '✅ تم توصيل طلبك #{{orderNumber}} بنجاح.',
    description:
      "Envoyé au client quand l'admin marque sa commande comme livrée.",
    priority: 'MEDIUM',
    enabled: true,
  },
  {
    key: 'ORDER_CANCELLED_BY_ADMIN_CLIENT',
    category: 'orders',
    portal: 'client',
    titleFr: 'Commande annulée',
    bodyFr: '❌ Votre commande #{{orderNumber}} a été annulée.',
    titleAr: 'تم إلغاء طلبك',
    bodyAr: '❌ تم إلغاء طلبك #{{orderNumber}}.',
    description: "Envoyé au client quand l'admin annule sa commande.",
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'ORDER_ASSIGNED_CLIENT',
    category: 'orders',
    portal: 'client',
    titleFr: 'Commande en route',
    bodyFr:
      '📦 Votre commande #{{orderNumber}} a été assignée à {{driverName}}.',
    titleAr: 'طلبك في الطريق',
    bodyAr: '📦 تم تعيين {{driverName}} لتوصيل طلبك #{{orderNumber}}.',
    description:
      "Envoyé au client quand l'admin assigne sa commande à un livreur.",
    priority: 'MEDIUM',
    enabled: true,
  },
  {
    key: 'ADMIN_CUSTOM_MESSAGE',
    category: 'clients',
    portal: 'client',
    titleFr: '{{title}}',
    bodyFr: '{{message}}',
    titleAr: '{{title}}',
    bodyAr: '{{message}}',
    description: "Message personnalisé envoyé par l'admin à un client.",
    priority: 'MEDIUM',
    enabled: true,
  },

  // ─── Delivery → Admin + Client ──────────────────────────────────────────────
  {
    key: 'DELIVERY_IN_PROGRESS_ADMIN',
    category: 'delivery',
    portal: 'backoffice',
    titleFr: 'Livraison en cours',
    bodyFr:
      '🚴 {{driverName}} est en route pour livrer la commande #{{orderNumber}} à {{clientName}}.',
    titleAr: 'جاري التوصيل',
    bodyAr:
      '🚴 {{driverName}} في الطريق لتوصيل الطلب #{{orderNumber}} إلى {{clientName}}.',
    description: 'Envoyé aux admins quand le livreur démarre la livraison.',
    priority: 'LOW',
    enabled: true,
  },
  {
    key: 'DELIVERY_IN_PROGRESS_CLIENT',
    category: 'delivery',
    portal: 'client',
    titleFr: 'Votre commande est en route',
    bodyFr:
      '🚴 {{driverName}} est en route avec votre commande #{{orderNumber}}.',
    titleAr: 'طلبك في الطريق إليك',
    bodyAr: '🚴 {{driverName}} في الطريق بطلبك #{{orderNumber}}.',
    description: 'Envoyé au client quand le livreur démarre la livraison.',
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'DELIVERY_COMPLETED_ADMIN',
    category: 'delivery',
    portal: 'backoffice',
    titleFr: 'Commande livrée',
    bodyFr:
      '✅ {{driverName}} a livré la commande #{{orderNumber}} à {{clientName}}.',
    titleAr: 'تم التسليم',
    bodyAr:
      '✅ قام {{driverName}} بتسليم الطلب #{{orderNumber}} إلى {{clientName}}.',
    description: 'Envoyé aux admins quand le livreur confirme la livraison.',
    priority: 'MEDIUM',
    enabled: true,
  },
  {
    key: 'DELIVERY_COMPLETED_CLIENT',
    category: 'delivery',
    portal: 'client',
    titleFr: 'Commande livrée',
    bodyFr: '✅ Votre commande #{{orderNumber}} a été livrée. Merci !',
    titleAr: 'تم التسليم',
    bodyAr: '✅ تم تسليم طلبك #{{orderNumber}}. شكراً لك!',
    description: 'Envoyé au client quand le livreur confirme la livraison.',
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'DELIVERY_FAILED_ADMIN',
    category: 'delivery',
    portal: 'backoffice',
    titleFr: 'Échec de livraison',
    bodyFr:
      '⚠️ {{driverName}} a signalé un échec de livraison pour la commande #{{orderNumber}}.',
    titleAr: 'فشل التسليم',
    bodyAr: '⚠️ أبلغ {{driverName}} عن فشل في تسليم الطلب #{{orderNumber}}.',
    description: 'Envoyé aux admins quand le livreur signale un échec.',
    priority: 'URGENT',
    enabled: true,
  },
  {
    key: 'DELIVERY_FAILED_CLIENT',
    category: 'delivery',
    portal: 'client',
    titleFr: 'Échec de livraison',
    bodyFr:
      "⚠️ Votre commande #{{orderNumber}} n'a pas pu être livrée. Nous vous recontactons.",
    titleAr: 'فشل التسليم',
    bodyAr: '⚠️ تعذّر تسليم طلبك #{{orderNumber}}. سنتواصل معك قريباً.',
    description:
      'Envoyé au client quand le livreur signale un échec de livraison.',
    priority: 'HIGH',
    enabled: true,
  },

  // ─── Stock Alerts → Backoffice ───────────────────────────────────────────────
  {
    key: 'STOCK_LOW_ALERT',
    category: 'stock',
    portal: 'backoffice',
    titleFr: 'Stock bas — {{productName}}',
    bodyFr:
      '⚠️ Le stock de "{{productName}}" est bas ({{stock}} unités restantes, seuil: {{threshold}}).',
    titleAr: 'مخزون منخفض — {{productName}}',
    bodyAr:
      '⚠️ مخزون "{{productName}}" منخفض ({{stock}} وحدات متبقية، الحد: {{threshold}}).',
    description:
      "Envoyé aux admins quand le stock d'un produit atteint le seuil d'alerte.",
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'STOCK_DAILY_SUMMARY',
    category: 'stock',
    portal: 'backoffice',
    titleFr: 'Résumé des stocks bas',
    bodyFr: "📊 {{count}} produit(s) ont un stock bas aujourd'hui.",
    titleAr: 'ملخص المخزون المنخفض',
    bodyAr: '📊 {{count}} منتج(ات) لديها مخزون منخفض اليوم.',
    description: 'Résumé quotidien des produits à stock bas.',
    priority: 'MEDIUM',
    enabled: true,
  },

  // ─── Payment Due Alerts → Backoffice ─────────────────────────────────────────
  {
    key: 'ORDER_PAYMENT_OVERDUE',
    category: 'payments',
    portal: 'backoffice',
    titleFr: 'Paiement en retard — Commande',
    bodyFr:
      '💰 La commande #{{orderNumber}} de {{clientName}} a un solde impayé de {{amount}} DH (échéance: {{dueDate}}).',
    titleAr: 'دفعة متأخرة — طلب',
    bodyAr:
      '💰 طلب #{{orderNumber}} من {{clientName}} لديه رصيد غير مدفوع {{amount}} درهم (تاريخ الاستحقاق: {{dueDate}}).',
    description:
      'Envoyé quotidiennement aux admins pour les commandes avec paiements en retard.',
    priority: 'HIGH',
    enabled: true,
  },
  {
    key: 'INVOICE_PAYMENT_OVERDUE',
    category: 'payments',
    portal: 'backoffice',
    titleFr: 'Facture impayée en retard',
    bodyFr:
      '💰 La facture #{{invoiceNumber}} de {{clientName}} a un solde impayé de {{amount}} DH (échéance: {{dueDate}}).',
    titleAr: 'فاتورة غير مدفوعة',
    bodyAr:
      '💰 فاتورة #{{invoiceNumber}} من {{clientName}} لها رصيد غير مدفوع {{amount}} درهم (تاريخ الاستحقاق: {{dueDate}}).',
    description:
      'Envoyé quotidiennement aux admins pour les factures en retard de paiement.',
    priority: 'HIGH',
    enabled: true,
  },

  // ─── System / Misc → Backoffice ──────────────────────────────────────────────
  {
    key: 'DRIVER_REGISTERED',
    category: 'system',
    portal: 'backoffice',
    titleFr: 'Nouveau livreur ajouté',
    bodyFr: '👤 {{driverName}} a été ajouté comme livreur.',
    titleAr: 'سائق توصيل جديد',
    bodyAr: '👤 تمت إضافة {{driverName}} كسائق توصيل.',
    description: 'Envoyé aux admins quand un nouveau livreur est ajouté.',
    priority: 'LOW',
    enabled: true,
  },
  {
    key: 'DAILY_SALES_SUMMARY',
    category: 'system',
    portal: 'backoffice',
    titleFr: 'Résumé des ventes du jour',
    bodyFr:
      "📈 Résumé du {{date}}: {{ordersCount}} commandes, chiffre d'affaires {{amount}} DH.",
    titleAr: 'ملخص مبيعات اليوم',
    bodyAr:
      '📈 ملخص {{date}}: {{ordersCount}} طلبات، رقم الأعمال {{amount}} درهم.',
    description: 'Résumé quotidien des ventes, envoyé en fin de journée.',
    priority: 'LOW',
    enabled: true,
  },
  {
    key: 'WEEKLY_REVENUE_REPORT',
    category: 'system',
    portal: 'backoffice',
    titleFr: 'Rapport hebdomadaire des revenus',
    bodyFr:
      '📊 Semaine du {{weekStart}}: {{ordersCount}} commandes, revenus totaux {{amount}} DH.',
    titleAr: 'تقرير الإيرادات الأسبوعي',
    bodyAr:
      '📊 أسبوع {{weekStart}}: {{ordersCount}} طلبات، إجمالي الإيرادات {{amount}} درهم.',
    description: 'Rapport de revenus hebdomadaire envoyé chaque lundi matin.',
    priority: 'LOW',
    enabled: true,
  },
  {
    key: 'ORDER_PENDING_UNASSIGNED',
    category: 'orders',
    portal: 'backoffice',
    titleFr: 'Commande non assignée',
    bodyFr:
      '⏳ La commande #{{orderNumber}} est en attente depuis {{minutes}} minutes.',
    titleAr: 'طلب غير معيّن',
    bodyAr: '⏳ الطلب #{{orderNumber}} في الانتظار منذ {{minutes}} دقيقة.',
    description:
      'Envoyé aux admins si une commande reste non assignée trop longtemps.',
    priority: 'MEDIUM',
    enabled: false,
  },
];

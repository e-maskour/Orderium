export default {
  // Page
  notifications: 'Notifications',
  notificationsSubtitle: 'Restez informé de tout ce qui se passe',
  markAllRead: 'Tout marquer comme lu',
  allNotificationsMarkedAsRead: 'Toutes les notifications marquées comme lues',
  searchNotifications: 'Rechercher dans les notifications...',

  // Tabs
  tabAll: 'Tout',
  tabUnread: 'Non lu',
  tabOrders: 'Commandes',
  tabStock: 'Stock',
  tabPayments: 'Paiements',
  tabTeam: 'Équipe',

  // Empty state
  emptyTitle: 'Aucune notification',
  emptySubtitle: 'Vous êtes à jour ! Toutes les nouveautés apparaîtront ici.',

  // Priority labels
  priorityCritical: 'Urgent',
  priorityHigh: 'Important',
  priorityMedium: 'Information',
  priorityLow: 'Rappel',

  // Notification type titles
  'notification.title.new_order': 'Nouvelle commande',
  'notification.title.order_cancelled': 'Commande annulée',
  'notification.title.order_delivered': 'Commande livrée',
  'notification.title.low_stock': 'Stock faible',
  'notification.title.out_of_stock': 'Rupture de stock',
  'notification.title.payment_received': 'Paiement reçu',
  'notification.title.payment_failed': 'Paiement échoué',
  'notification.title.new_user': 'Nouveau membre',
  'notification.title.user_deactivated': 'Compte désactivé',
  'notification.title.system_update': 'Mise à jour disponible',
  'notification.title.backup_done': 'Sauvegarde terminée',
  'notification.title.order_assigned': 'Commande assignée',
  'notification.title.order_status_changed': 'Mise à jour du statut',
  'notification.title.delivery_status_update': 'Mise à jour de livraison',
  'notification.title.system': 'Alerte système',
  'notification.title.info': 'Information',
  'notification.title.warning': 'Avertissement',
  'notification.title.error': 'Erreur',

  // Notification type messages (with interpolation)
  'notification.message.new_order':
    'Commande {{reference}} reçue de {{client}} pour un montant de {{amount}}',
  'notification.message.order_cancelled': 'La commande {{reference}} a été annulée par {{client}}',
  'notification.message.order_delivered': 'La commande {{reference}} a été livrée avec succès',
  'notification.message.low_stock':
    'Le produit {{product}} est en stock faible : {{quantity}} restant(s)',
  'notification.message.out_of_stock': 'Le produit {{product}} est en rupture de stock',
  'notification.message.payment_received':
    'Paiement de {{amount}} reçu pour la commande {{reference}}',
  'notification.message.payment_failed': 'Échec du paiement pour la commande {{reference}}',
  'notification.message.new_user': "{{name}} a rejoint l'équipe en tant que {{role}}",
  'notification.message.user_deactivated': 'Le compte de {{name}} a été désactivé',
  'notification.message.system_update': 'La version {{version}} de Morocom est disponible',
  'notification.message.backup_done': 'Sauvegarde automatique effectuée le {{date}}',
  'notification.message.order_assigned': 'La commande {{orderNumber}} vous a été assignée',
  'notification.message.order_status_changed':
    'Le statut de la commande {{orderNumber}} a été mis à jour à {{status}}',
  'notification.message.delivery_status_update':
    'Mise à jour de livraison pour la commande {{orderNumber}}: {{status}}',
  'notification.message.system': '{{message}}',

  // Relative time
  justNow: "À l'instant",
  minutesAgo: 'Il y a {{count}} min',
  hoursAgo: 'Il y a {{count}} h',
  daysAgo: 'Il y a {{count}} j',

  // Actions
  actionView: 'Voir',
  actionDismiss: 'Ignorer',
  viewAllNotifications: 'Voir toutes les notifications',
  notificationSettings: 'Paramètres des notifications',
  markAsRead: 'Marquer comme lu',
  notificationDismissed: 'Notification supprimée',

  // Date groups
  dateToday: "Aujourd'hui",
  dateYesterday: 'Hier',
  dateThisWeek: 'Cette semaine',
  dateOlder: 'Plus ancien',

  // Settings page
  settingsTitle: 'Paramètres des notifications',
  settingsSubtitle: 'Choisissez comment vous souhaitez être notifié',
  channelInApp: "Dans l'application",
  channelEmail: 'Par e-mail',
  channelSms: 'Par SMS',
  categoryOrders: 'Commandes',
  categoryStock: 'Stock',
  categoryPayments: 'Paiements',
  categoryTeam: 'Équipe',
  categorySystem: 'Système',
  criticalCannotDisable:
    "Les notifications urgentes dans l'application ne peuvent pas être désactivées",
  settingsSaved: 'Paramètres enregistrés',

  // Status translations
  'status.to_delivery': 'À livrer',
  'status.in_delivery': 'En livraison',
  'status.delivered': 'Livré',
  'status.canceled': 'Annulé',

  // Bulk/misc
  deleteNotifications: 'Supprimer les notifications',
  confirmDeleteMessage:
    'Êtes-vous sûr de vouloir supprimer {{count}} notification(s) ? Cette action ne peut pas être annulée.',
  notificationsMarkedAsRead: '{{count}} notifications marquées comme lues',
  notificationsDeleted: '{{count}} notifications supprimées',
  notifyWhenSomethingHappens: 'Nous vous préviendrons quand quelque chose se produit',
};

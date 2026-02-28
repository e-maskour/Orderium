export default {
  // Notifications Page
  notifications: 'Notifications',
  noNotifications: 'Aucune notification',
  markAllRead: 'Tout marquer comme lu',
  allNotificationsMarkedAsRead: 'Toutes les notifications marquées comme lues',
  manageNotifications: 'Gérer vos notifications et alertes',
  allNotifications: 'Toutes les Notifications',
  viewAndManageHistory: 'Voir et gérer votre historique de notifications',
  searchNotifications: 'Rechercher des notifications...',
  allTypes: 'Tous les types',
  allPriority: 'Toute priorité',
  selected: 'sélectionné(s)',
  markAsRead: 'Marquer comme lu',
  archive: 'Archiver',
  delete: 'Supprimer',
  unread: 'Non lu',
  all: 'Tout',
  archived: 'Archivé',
  noNotificationsFound: 'Aucune notification trouvée',
  allCaughtUp: 'Vous êtes à jour !',
  tryAdjustingFilters: 'Essayez d\'ajuster vos filtres',
  selectAll: 'Tout sélectionner',
  showing: 'Affichage de',
  to: 'à',
  of: 'sur',
  results: 'résultats',
  page: 'Page',
  previous: 'Précédent',
  next: 'Suivant',
  
  // Stats Cards
  totalNotifications: 'Total des Notifications',
  today: 'Aujourd\'hui',
  thisWeek: 'Cette Semaine',
  
  // INotification Types
  newOrders: 'Nouvelles Commandes',
  assigned: 'Assignées',
  statusChanged: 'Statut modifié',
  payments: 'Paiements',
  
  // Priority Levels
  urgent: 'Urgent',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
  
  // INotification Titles (Translation Keys)
  'notification.title.new_order': '🛒 Nouvelle commande',
  'notification.title.order_assigned': '👤 Commande assignée',
  'notification.title.order_status_changed': '📦 Mise à jour du statut',
  'notification.title.delivery_status_update': '🚚 Mise à jour de livraison',
  'notification.title.order_cancelled': '❌ Commande annulée',
  'notification.title.payment_received': '💰 Paiement reçu',
  'notification.title.low_stock': '⚠️ Stock faible',
  'notification.title.system': '⚙️ Alerte système',
  'notification.title.info': 'ℹ️ Information',
  'notification.title.warning': '⚠️ Avertissement',
  'notification.title.error': '🚨 Erreur',
  
  // INotification Messages (Translation Keys with placeholders)
  'notification.message.new_order': 'Commande {{orderNumber}} reçue de {{customerName}}',
  'notification.message.order_assigned': 'La commande {{orderNumber}} vous a été assignée',
  'notification.message.order_status_changed': 'Le statut de la commande {{orderNumber}} a été mis à jour à {{status}}',
  'notification.message.delivery_status_update': 'Mise à jour de livraison pour la commande {{orderNumber}}: {{status}}',
  'notification.message.order_cancelled': 'La commande {{orderNumber}} a été annulée',
  'notification.message.payment_received': 'Paiement de {{amount}} reçu pour la commande {{orderNumber}}',
  'notification.message.low_stock': 'Le produit {{productName}} a atteint un stock faible : {{quantity}} restant',
  'notification.message.system': '{{message}}',
  
  // Time Indicators
  justNow: 'À l\'instant',
  minutesAgo: 'min',
  hoursAgo: 'h',
  daysAgo: 'j',
  
  // Status translations
  'status.to_delivery': 'À livrer',
  'status.in_delivery': 'En livraison',
  'status.delivered': 'Livré',
  'status.canceled': 'Annulé',
  
  // Confirm Dialog
  deleteNotifications: 'Supprimer les notifications',
  confirmDeleteMessage: 'Êtes-vous sûr de vouloir supprimer {{count}} notification(s) ? Cette action ne peut pas être annulée.',
  notificationsMarkedAsRead: '{{count}} notifications marquées comme lues',
  notificationArchived: 'INotification archivée',
  notificationsArchived: '{{count}} notifications archivées',
  notificationsDeleted: '{{count}} notifications supprimées',
  notifyWhenSomethingHappens: 'Nous vous préviendrons quand quelque chose se produit',
};

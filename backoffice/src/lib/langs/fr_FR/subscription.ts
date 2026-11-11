export default {
  // ─── Subscription / plan ──────────────────────────────────
  mySubscription: 'Mon abonnement',
  subscriptionSubtitle: 'Votre offre, les modules inclus et votre consommation',
  subscriptionCurrentPlan: 'Offre actuelle',
  subscriptionStatus: 'Statut',
  subscriptionStatus_trial: "Période d'essai",
  subscriptionStatus_active: 'Actif',
  subscriptionStatus_expired: 'Expiré',
  subscriptionStatus_suspended: 'Suspendu',
  subscriptionStatus_disabled: 'Désactivé',
  subscriptionTrialEndsOn: "Fin de l'essai",
  subscriptionRenewsOn: 'Renouvellement',
  subscriptionNoEndDate: 'Sans échéance',
  subscriptionFeatures: 'Modules de votre offre',
  subscriptionFeature_pos: 'Point de vente & caisse',
  subscriptionFeature_delivery: 'Livreurs & portail livreur',
  subscriptionFeature_client_portal: 'Portail client (commandes en ligne)',
  subscriptionFeature_reports: 'Rapports avancés & exports',
  subscriptionIncluded: 'Inclus',
  subscriptionNotIncluded: 'Non inclus',
  subscriptionUsage: 'Consommation',
  subscriptionLimit_users: 'Utilisateurs',
  subscriptionLimit_products: 'Produits',
  subscriptionLimit_warehouses: 'Dépôts',
  subscriptionLimit_deliveryPersons: 'Livreurs',
  subscriptionLimit_ordersPerMonth: 'Commandes ce mois-ci',
  subscriptionLimit_storageMb: 'Stockage',
  subscriptionUnlimited: 'Illimité',
  subscriptionLimitNear: 'Limite bientôt atteinte',
  subscriptionLimitReached: 'Limite atteinte',
  subscriptionUnitMb: 'Mo',
  subscriptionUnitGb: 'Go',
  subscriptionChangePlan: "Changer d'offre",
  subscriptionChangePlanHint:
    "Choisissez l'offre souhaitée : notre équipe vous répond sur WhatsApp pour l'activer.",
  subscriptionWantedPlan: 'Offre souhaitée',
  subscriptionWhatsAppMessage:
    "Bonjour, je souhaite changer d'offre Marnova.\nEntreprise : {tenant}\nOffre actuelle : {current}\nOffre souhaitée : {wanted}",
  subscriptionLoadError: "Impossible de charger les informations de l'abonnement.",
  subscriptionRetry: 'Réessayer',

  // ─── Plan-locked screens & errors ─────────────────────────
  planLockedBadge: 'Non inclus dans votre offre',
  planLockedTitle: "Ce module n'est pas inclus dans votre offre",
  planLockedBody_pos:
    "Le point de vente n'est pas disponible avec votre abonnement actuel. Passez à une offre supérieure pour encaisser vos ventes au comptoir.",
  planLockedBody_caisse:
    "La caisse n'est pas disponible avec votre abonnement actuel. Passez à une offre supérieure pour suivre vos encaissements.",
  planLockedBody_reports:
    'Les rapports avancés et les exports ne sont pas inclus dans votre abonnement actuel. Le tableau de bord reste disponible.',
  planLockedBody_delivery:
    "La gestion des livreurs n'est pas incluse dans votre abonnement actuel. Passez à une offre supérieure pour organiser vos livraisons.",
  planLockedBody_clientRequests:
    "Le portail client n'est pas inclus dans votre abonnement actuel. Passez à l'offre Pro pour recevoir les inscriptions et commandes en ligne de vos clients.",
  planSeeSubscription: 'Voir mon abonnement',
  planErrorSeeSubscription: 'Voir mon abonnement →',
  planErrorLimitFallback: 'Limite de votre abonnement atteinte.',
  planErrorFeatureFallback: "Cette fonctionnalité n'est pas incluse dans votre abonnement.",

  // ─── Plan limit reached (create screens) ──────────────────
  planLimitBadge: 'Limite atteinte',
  planLimitTitle: 'Limite de votre offre atteinte',
  planLimitBody:
    "Votre offre {plan} permet {limit} {unit} maximum et vous en avez déjà {used}. Changez d'offre pour continuer à en ajouter.",
  planLimitBodyNone: "Votre offre {plan} n'inclut pas de {unit}. Changez d'offre pour en ajouter.",
  planLimitBodyStorage:
    "Votre offre {plan} inclut {limit} de stockage et vous en utilisez déjà {used}. Changez d'offre pour ajouter des fichiers.",
  planLimitBodyOrders:
    "Votre offre {plan} permet {limit} commandes par mois et vous en avez déjà créé {used} ce mois-ci. Changez d'offre pour continuer à créer des commandes.",
  planLimitUnit_users: 'utilisateurs',
  planLimitUnit_products: 'produits',
  planLimitUnit_warehouses: 'dépôts',
  planLimitUnit_deliveryPersons: 'livreurs',
  planLimitUnit_ordersPerMonth: 'commandes par mois',
  planLimitUnit_storageMb: 'stockage',
  planLimitUsage: '{used} / {limit}',
  planLimitChangePlan: "Changer d'offre",
  planLimitBack: 'Retour',
  planLimitClose: 'Fermer',
  planLimitKeepWorking:
    'Le reste de votre espace reste disponible : vous pouvez consulter et modifier vos données.',
};

import type { SolutionsDictionary } from './types';

const NB = ' '; // non-breaking space before French high punctuation

export const solutionsFr: SolutionsDictionary = {
  ui: {
    home: 'Accueil',
    solutions: 'Solutions',
    related: 'Découvrez aussi',
    seePricing: 'Voir tous les tarifs',
    before: 'Aujourd’hui',
    after: 'Avec Marnova',
    cta1: 'Demander une démo sur WhatsApp',
    cta2: 'Écrire par email',
  },
  pages: {
    'logiciel-facturation-maroc': {
      label: 'Logiciel de facturation',
      meta: {
        title: 'Logiciel de facturation Maroc : factures ICE, IF, RC | Marnova',
        description:
          'Créez devis et factures conformes ICE, IF, RC en deux minutes, en arabe ou en français. TVA, numérotation et suivi des paiements automatiques. Essai gratuit 14 jours.',
      },
      kicker: 'Logiciel de facturation pour PME au Maroc',
      h1: 'Des factures conformes en deux minutes, sans rien ressaisir.',
      lead: `Devis, factures et suivi des paiements dans un seul outil en ligne${NB}: mentions ICE, IF et RC, TVA calculée, numérotation séquentielle et PDF prêt à envoyer par WhatsApp ou email.`,
      points: ['Factures conformes ICE, IF, RC', 'En arabe et en français', 'Dès 149 DH HT par mois'],
      wa: 'Bonjour, je cherche un logiciel de facturation. Je souhaite une démo de Marnova.',
      shotAlt: 'Liste des factures de vente dans Marnova, avec échéances et montants HT et TTC',
      pains: {
        title: 'Fini les factures recopiées dans Word et les impayés oubliés.',
        lead: 'Beaucoup de PME marocaines facturent encore à la main, dans Word ou dans Excel. Résultat : des erreurs de TVA, des numéros en double et des clients qui oublient de payer.',
        rows: [
          ['Chaque facture est recopiée à la main, ligne par ligne.', 'Le devis accepté devient facture en un clic, sans rien ressaisir.'],
          ['Les totaux HT, TVA et TTC se calculent à la calculatrice.', 'Les taux de TVA sont configurés une fois et les totaux se calculent seuls.'],
          ['La numérotation saute ou se répète d’un fichier à l’autre.', 'Chaque document suit sa propre séquence de numérotation, sans trou ni doublon.'],
          ['Personne ne sait quelles factures restent impayées.', 'Le reste à payer de chaque facture et de chaque client est visible à tout moment.'],
        ],
      },
      features: {
        title: `Tout ce qu’un logiciel de facturation doit faire au Maroc`,
        lead: 'Marnova couvre la facturation de bout en bout, du premier devis jusqu’au dernier dirham encaissé.',
        items: [
          { t: 'Devis et factures en deux minutes', d: 'Choisissez le client et les articles : prix, TVA et totaux se remplissent seuls. Le PDF part par email ou WhatsApp.' },
          { t: 'Mentions légales marocaines', d: 'ICE, IF, RC et CNSS de votre entreprise et de vos clients apparaissent sur chaque document, avec le détail HT, TVA et TTC.' },
          { t: 'Du devis à la facture sans ressaisie', d: 'Devis, bon de commande, bon de livraison et facture se suivent : un clic suffit pour passer à l’étape suivante.' },
          { t: 'Paiements partiels et échéances', d: 'Enregistrez les acomptes et les règlements, avec plusieurs moyens de paiement. Le reste à payer se met à jour seul.' },
          { t: 'Factures d’achat aussi', d: 'Bons de commande fournisseurs et factures d’achat suivent la même logique, pour savoir ce que vous devez et à qui.' },
          { t: 'Rapports et exports', d: 'Ventes, achats, clients, fournisseurs et paiements par période, exportables en Excel et PDF pour votre comptable.' },
        ],
      },
      who: {
        title: 'Pour toutes les PME qui facturent leurs clients.',
        items: ['Distributeurs', 'Grossistes', 'Commerces de détail', 'Quincailleries', 'Matériaux de construction', 'Pièces auto', 'Import-export', 'Prestataires de services'],
      },
      price: {
        t: `Facturez dès 149${NB}DH HT par mois`,
        d: 'L’offre Starter inclut devis, factures et suivi des paiements pour 2 utilisateurs. Essai gratuit de 14 jours, sans carte bancaire.',
      },
      faq: {
        title: 'Questions sur le logiciel de facturation.',
        items: [
          { q: `Les factures de Marnova sont-elles conformes au Maroc${NB}?`, a: 'Elles portent les mentions attendues au Maroc : ICE, IF et RC de l’émetteur et du client, détail HT, TVA et TTC, et une numérotation séquentielle. Elles s’exportent en PDF.' },
          { q: `Puis-je facturer en arabe${NB}?`, a: 'Oui. L’interface et les documents existent en arabe et en français. Chaque utilisateur choisit sa langue.' },
          { q: `Puis-je gérer plusieurs taux de TVA${NB}?`, a: 'Oui. Vous configurez vos taux de TVA une fois, puis vous les affectez à vos produits. Les totaux HT, TVA et TTC se calculent automatiquement sur chaque document.' },
          { q: `Comment suivre les factures impayées${NB}?`, a: 'Chaque paiement, même partiel, est rattaché à sa facture. Vous voyez le reste à payer par facture et par client, avec les échéances.' },
          { q: `Puis-je reprendre mes clients et produits existants${NB}?`, a: 'Oui. Nous vous aidons à importer votre catalogue et votre liste de clients pour démarrer sans tout ressaisir.' },
        ],
      },
    },

    'logiciel-gestion-stock-maroc': {
      label: 'Logiciel de gestion de stock',
      meta: {
        title: 'Logiciel de gestion de stock Maroc, multi-dépôts | Marnova',
        description:
          'Suivez votre stock en temps réel dans tous vos dépôts : entrées, sorties, ajustements et alertes de stock bas. En ligne, en arabe et en français. Essai gratuit 14 jours.',
      },
      kicker: 'Logiciel de gestion de stock pour PME au Maroc',
      h1: 'Sachez à tout moment ce que vous avez en stock, dans chaque dépôt.',
      lead: 'Marnova met à jour votre stock à chaque achat, vente et livraison. Vous voyez les quantités par dépôt en temps réel et repérez les ruptures avant qu’elles n’arrivent.',
      points: ['Stock en temps réel', 'Plusieurs dépôts', 'En arabe et en français'],
      wa: 'Bonjour, je cherche un logiciel de gestion de stock. Je souhaite une démo de Marnova.',
      shotAlt: 'Tableau de bord Marnova avec chiffre d’affaires, encaissements et indicateurs de l’activité',
      pains: {
        title: 'Fini le stock compté à la main et les ruptures surprises.',
        lead: 'Quand le stock vit dans un cahier ou un fichier Excel, il est faux dès la première vente. Marnova le tient à jour tout seul.',
        rows: [
          ['Le stock se compte à la main, une fois par mois au mieux.', 'Chaque vente, achat et livraison met le stock à jour automatiquement.'],
          ['On découvre la rupture quand le client demande le produit.', 'Les produits en stock bas sont signalés avant la rupture.'],
          ['Impossible de savoir ce qu’il reste dans l’autre dépôt.', 'Les quantités de chaque dépôt sont visibles depuis n’importe où.'],
          ['Les écarts d’inventaire restent inexpliqués.', 'Chaque ajustement de stock est enregistré avec son motif.'],
        ],
      },
      features: {
        title: `Une gestion de stock reliée à vos ventes et à vos achats`,
        lead: 'Le stock n’est pas un module à part : il bouge avec chaque document de votre activité.',
        items: [
          { t: 'Multi-dépôts', d: 'Gérez un magasin, un entrepôt et un dépôt régional dans le même outil, avec les quantités de chacun.' },
          { t: 'Mouvements automatiques', d: 'Les bons de livraison sortent le stock, les réceptions fournisseurs le font entrer. Rien à saisir deux fois.' },
          { t: 'Alertes de stock bas', d: 'Définissez un seuil par produit et soyez prévenu avant de manquer d’un article qui se vend.' },
          { t: 'Ajustements justifiés', d: 'Casse, perte, inventaire : chaque correction garde son motif, son auteur et sa date.' },
          { t: 'Unités de mesure', d: 'Vendez à la pièce, au carton ou au kilo, avec l’unité adaptée à chaque produit.' },
          { t: 'Rapports de stock', d: 'Stock, ventes et achats par période, exportables en Excel et PDF.' },
        ],
      },
      who: {
        title: 'Pour les entreprises qui achètent, stockent et revendent.',
        items: ['Distributeurs', 'Grossistes', 'Épiceries et supérettes', 'Quincailleries', 'Matériaux de construction', 'Pièces auto', 'Cosmétiques', 'Électroménager'],
      },
      price: {
        t: `Gérez votre stock dès 149${NB}DH HT par mois`,
        d: 'Starter pour un dépôt, Business pour deux, Pro jusqu’à cinq dépôts. Essai gratuit de 14 jours, sans carte bancaire.',
      },
      faq: {
        title: 'Questions sur la gestion de stock.',
        items: [
          { q: `Combien de dépôts puis-je gérer${NB}?`, a: 'Un dépôt avec Starter, deux avec Business, cinq avec Pro et un nombre illimité avec Entreprise. Vous pouvez aussi ajouter un dépôt à la carte.' },
          { q: `Le stock se met-il à jour tout seul${NB}?`, a: 'Oui. Les ventes, livraisons, réceptions et ventes en caisse modifient le stock du bon dépôt sans aucune saisie supplémentaire.' },
          { q: `Puis-je faire un inventaire${NB}?`, a: 'Oui. Vous corrigez les quantités par ajustement, avec un motif pour chaque écart. L’historique reste consultable.' },
          { q: `Puis-je voir le stock depuis mon téléphone${NB}?`, a: 'Oui. Marnova fonctionne dans le navigateur, sur ordinateur, tablette et téléphone. Rien à installer.' },
          { q: `Est-ce aussi un logiciel de facturation${NB}?`, a: 'Oui. Devis, commandes, livraisons et factures font partie du même outil, et chacun met le stock à jour.' },
        ],
      },
    },

    'logiciel-caisse-maroc': {
      label: 'Logiciel de caisse',
      meta: {
        title: 'Logiciel de caisse Maroc : point de vente tactile | Marnova',
        description:
          'Logiciel de caisse en ligne pour magasins au Maroc : encaissement tactile, tickets sur imprimante thermique et stock mis à jour à chaque vente. En arabe et en français.',
      },
      kicker: 'Logiciel de caisse et point de vente au Maroc',
      h1: 'Une caisse simple au comptoir, reliée à votre stock et à vos factures.',
      lead: 'Encaissez vos clients en quelques touches, imprimez le ticket sur imprimante thermique et retrouvez chaque vente dans vos rapports. Le stock du magasin se met à jour tout seul.',
      points: ['Caisse tactile', 'Tickets sur imprimante thermique', 'Stock mis à jour à chaque vente'],
      wa: 'Bonjour, je cherche un logiciel de caisse pour mon magasin. Je souhaite une démo de Marnova.',
      shotAlt: 'Écran de point de vente Marnova avec les produits, leurs photos et leurs prix',
      pains: {
        title: 'Fini le cahier de caisse et les ventes qui ne sortent pas du stock.',
        lead: 'Une caisse enregistreuse seule ne sait rien de votre stock ni de vos clients en compte. Marnova relie le comptoir au reste de l’entreprise.',
        rows: [
          ['Les ventes du jour se notent dans un cahier.', 'Chaque vente est enregistrée, avec le ticket et le moyen de paiement.'],
          ['Le stock du magasin ne bouge pas quand on vend.', 'Chaque article vendu en caisse sort du stock du magasin.'],
          ['La caisse et les factures vivent dans deux outils.', 'Ventes de caisse et factures apparaissent dans les mêmes rapports.'],
          ['Le gérant doit être sur place pour connaître les ventes.', 'Le gérant suit les ventes du jour depuis son téléphone.'],
        ],
      },
      features: {
        title: `Un point de vente pensé pour les commerces marocains`,
        lead: 'La caisse fait partie de Marnova : mêmes produits, mêmes prix, même stock que le back-office.',
        items: [
          { t: 'Caisse tactile', d: 'Vos produits avec leurs photos et leurs prix, sur ordinateur, tablette ou écran tactile. Une vente se fait en quelques touches.' },
          { t: 'Tickets thermiques', d: 'Imprimez le ticket de caisse sur imprimante thermique, directement depuis la caisse.' },
          { t: 'Stock en direct', d: 'Chaque vente sort les articles du stock du magasin, sans aucune saisie supplémentaire.' },
          { t: 'Plusieurs moyens de paiement', d: 'Plusieurs moyens de paiement et paiements partiels : chaque encaissement est enregistré.' },
          { t: 'Rôles des caissiers', d: 'Le caissier n’accède qu’à la caisse. Le gérant garde la main sur les prix et les rapports.' },
          { t: 'Rapports de ventes', d: 'Les ventes de caisse rejoignent vos factures dans les mêmes rapports, exportables en Excel et PDF.' },
        ],
      },
      who: {
        title: 'Pour les commerces qui vendent au comptoir.',
        items: ['Épiceries et supérettes', 'Quincailleries', 'Boulangeries', 'Cosmétiques', 'Pièces auto', 'Électroménager', 'Fournitures de bureau', 'Restauration'],
      },
      price: {
        t: `La caisse est incluse dès l’offre Business, à 349${NB}DH HT par mois`,
        d: 'Avec 5 utilisateurs, 2 dépôts, les livraisons et les rapports avancés. Essai gratuit de 14 jours, sans carte bancaire.',
      },
      faq: {
        title: 'Questions sur le logiciel de caisse.',
        items: [
          { q: `Faut-il acheter du matériel spécial${NB}?`, a: 'Non. La caisse fonctionne dans le navigateur, sur un ordinateur, une tablette ou un écran tactile. Une imprimante thermique suffit pour les tickets.' },
          { q: `La caisse met-elle à jour le stock${NB}?`, a: 'Oui. Chaque article vendu sort du stock du magasin, et vous voyez les quantités restantes en temps réel.' },
          { q: `Puis-je avoir plusieurs caissiers${NB}?`, a: 'Oui. Chaque caissier a son propre accès, et son rôle limite ce qu’il peut voir et modifier.' },
          { q: `Puis-je faire une facture à partir d’une vente en caisse${NB}?`, a: 'Les ventes de caisse et les factures partagent les mêmes clients, produits et rapports. Pour un client professionnel, vous établissez sa facture conforme ICE, IF, RC dans Marnova.' },
          { q: `Quelle offre inclut la caisse${NB}?`, a: 'La caisse et point de vente est incluse dans les offres Business, Pro et Entreprise.' },
        ],
      },
    },

    'logiciel-gestion-livraison-maroc': {
      label: 'Logiciel de gestion des livraisons',
      meta: {
        title: 'Logiciel de gestion des livraisons Maroc | Marnova',
        description:
          'Affectez les livraisons à vos livreurs, suivez leur statut en direct et encaissez à la livraison. Portail livreur sur téléphone avec Google Maps et Waze. Essai gratuit.',
      },
      kicker: 'Logiciel de gestion des livraisons au Maroc',
      h1: 'Vos livreurs savent où aller. Vous savez ce qui est livré et encaissé.',
      lead: 'Marnova affecte chaque commande à un livreur, qui voit sa tournée sur son téléphone et met à jour le statut en un geste. Le bureau suit tout en direct, montants encaissés compris.',
      points: ['Portail livreur sur téléphone', 'Statut en direct', 'Encaissement à la livraison suivi'],
      wa: 'Bonjour, je cherche un logiciel pour gérer mes livraisons. Je souhaite une démo de Marnova.',
      shotAlt: 'Liste des commandes Marnova avec statut, origine, montant payé et reste à encaisser',
      pains: {
        title: 'Fini les appels pour savoir où en est la livraison.',
        lead: 'Quand les livraisons s’organisent par téléphone et WhatsApp, personne ne sait vraiment ce qui est parti, livré ou encaissé.',
        rows: [
          ['Les livreurs appellent pour savoir où aller.', 'Chaque livreur voit sa liste de livraisons avec adresse et téléphone du client.'],
          ['Le bureau ne sait pas ce qui est livré.', 'Le statut de chaque livraison se met à jour en direct.'],
          ['L’argent encaissé à la livraison se compte le soir, à la main.', 'Le montant encaissé par chaque livreur est suivi commande par commande.'],
          ['Le stock ne bouge pas quand la marchandise part.', 'Le bon de livraison sort les quantités du bon dépôt.'],
        ],
      },
      features: {
        title: `Toute la tournée, du dépôt jusqu’au client`,
        lead: 'Les livraisons sont reliées aux commandes, au stock et aux paiements : rien n’est ressaisi.',
        items: [
          { t: 'Affectation des livraisons', d: 'Affectez chaque commande à un livreur en un clic, et réaffectez-la si besoin.' },
          { t: 'Portail livreur', d: 'Une application web pensée pour le téléphone : liste des livraisons, détail de la commande et montant à encaisser.' },
          { t: 'Google Maps et Waze', d: 'Le livreur appelle le client ou lance l’itinéraire vers son adresse en un geste.' },
          { t: 'Statut en direct', d: 'Le livreur met à jour le statut en un geste, et le bureau voit l’avancement de chaque tournée sans téléphoner.' },
          { t: 'Encaissement suivi', d: 'Les montants encaissés à la livraison sont rattachés à la commande, et le total de la tournée est visible.' },
          { t: 'Notifications', d: 'L’équipe est prévenue à chaque nouvelle commande, livraison ou paiement.' },
        ],
      },
      who: {
        title: 'Pour les entreprises qui livrent leurs clients.',
        items: ['Distributeurs', 'Grossistes', 'Eau et boissons', 'Produits alimentaires', 'Matériaux de construction', 'Cosmétiques', 'E-commerce', 'Restauration'],
      },
      price: {
        t: `Les livraisons sont incluses dès l’offre Business, à 349${NB}DH HT par mois`,
        d: 'Business inclut 3 livreurs, Pro des livreurs illimités. Essai gratuit de 14 jours, sans carte bancaire.',
      },
      faq: {
        title: 'Questions sur la gestion des livraisons.',
        items: [
          { q: `Mes livreurs doivent-ils installer une application${NB}?`, a: 'Non. Le portail livreur s’ouvre dans le navigateur du téléphone, sans rien installer. Chaque livreur a son propre accès.' },
          { q: `Combien de livreurs puis-je ajouter${NB}?`, a: 'Trois avec Business, un nombre illimité avec Pro et Entreprise. Vous pouvez aussi ajouter des livreurs à la carte.' },
          { q: `Le livreur peut-il encaisser à la livraison${NB}?`, a: 'Oui. Le montant à encaisser est affiché sur chaque livraison, et le total encaissé de la tournée reste visible pour le bureau.' },
          { q: `Mes clients peuvent-ils suivre leur commande${NB}?`, a: 'Avec l’offre Pro, vos clients ont un portail pour commander en ligne et suivre leurs commandes jusqu’à la livraison.' },
          { q: `Le stock est-il mis à jour à la livraison${NB}?`, a: 'Oui. Le bon de livraison sort les quantités du dépôt d’où part la marchandise.' },
        ],
      },
    },

    'logiciel-distribution-grossiste-maroc': {
      label: 'Logiciel pour distributeurs et grossistes',
      meta: {
        title: 'Logiciel pour distributeurs et grossistes au Maroc | Marnova',
        description:
          'ERP pour distributeurs et grossistes au Maroc : commandes, stock multi-dépôts, livraisons, factures ICE et portail de commande en ligne pour vos clients. Démo gratuite.',
      },
      kicker: 'ERP pour distributeurs et grossistes au Maroc',
      h1: 'Le logiciel de gestion des distributeurs qui vendent, stockent et livrent.',
      lead: 'Commandes de vos revendeurs, stock de plusieurs dépôts, tournées de livraison et factures conformes : Marnova réunit toute la chaîne de distribution dans un seul outil, en arabe et en français.',
      points: ['Portail de commande pour vos clients', 'Stock multi-dépôts', 'Livreurs illimités avec Pro'],
      wa: 'Bonjour, je suis distributeur et je souhaite une démo de Marnova.',
      shotAlt: 'Rapports Marnova avec l’évolution du chiffre d’affaires et des commandes',
      pains: {
        title: 'Fini les commandes perdues sur WhatsApp et les dépôts dans le flou.',
        lead: 'Un distributeur reçoit des dizaines de commandes par jour, par téléphone, WhatsApp et commerciaux. Sans outil commun, les erreurs coûtent cher.',
        rows: [
          ['Les commandes des revendeurs arrivent par téléphone et WhatsApp.', 'Vos clients commandent seuls sur leur portail, avec vos prix et les photos des produits.'],
          ['Chaque dépôt tient son propre fichier de stock.', 'Le stock de tous les dépôts est dans le même outil, en temps réel.'],
          ['Les tournées se préparent au téléphone.', 'Les livraisons sont affectées aux livreurs, qui les suivent sur leur téléphone.'],
          ['Le recouvrement se fait de mémoire.', 'Le reste à payer de chaque revendeur est visible, facture par facture.'],
        ],
      },
      features: {
        title: `Toute la chaîne de distribution dans un seul logiciel`,
        lead: 'De la commande du revendeur jusqu’à l’encaissement, chaque étape alimente la suivante.',
        items: [
          { t: 'Portail de commande B2B', d: 'Vos revendeurs consultent le catalogue par marque ou catégorie, commandent en ligne et retrouvent leurs factures.' },
          { t: 'Stock multi-dépôts', d: 'Jusqu’à 5 dépôts avec Pro, et sans limite avec Entreprise, avec les quantités de chacun en temps réel.' },
          { t: 'Livraisons et livreurs', d: 'Affectation des tournées, portail livreur sur téléphone et suivi des montants encaissés.' },
          { t: 'Achats fournisseurs', d: 'Bons de commande et factures d’achat, pour réapprovisionner les dépôts au bon moment.' },
          { t: 'Facturation conforme', d: 'Factures avec ICE, IF et RC, TVA calculée et paiements partiels suivis par client.' },
          { t: 'Rapports de pilotage', d: 'Chiffre d’affaires, commandes, clients, stock et encaissements, exportables en Excel et PDF.' },
        ],
      },
      who: {
        title: 'Pour les distributeurs de tous les secteurs.',
        items: ['Produits alimentaires', 'Eau et boissons', 'Hygiène et cosmétiques', 'Matériaux de construction', 'Pièces auto', 'Électroménager', 'Fournitures de bureau', 'Import-export'],
      },
      price: {
        t: `L’offre Pro des distributeurs, à 699${NB}DH HT par mois`,
        d: '15 utilisateurs, 5 dépôts, produits et livreurs illimités, portail client inclus. Essai gratuit de 14 jours, sans carte bancaire.',
      },
      faq: {
        title: 'Questions des distributeurs et grossistes.',
        items: [
          { q: `Mes clients peuvent-ils passer commande eux-mêmes${NB}?`, a: 'Oui, avec l’offre Pro. Vos clients ont un portail avec votre catalogue, vos prix et le suivi de leurs commandes et factures.' },
          { q: `Combien de produits puis-je gérer${NB}?`, a: 'Jusqu’à 5 000 produits avec Business, et un nombre illimité avec Pro et Entreprise.' },
          { q: `Puis-je gérer des commerciaux et des rôles différents${NB}?`, a: 'Oui. Chaque employé a un rôle qui définit les écrans auxquels il accède : commercial, magasinier, comptable ou gérant.' },
          { q: `Reprenez-vous mes données existantes${NB}?`, a: 'Oui. Nous importons votre catalogue, vos clients et vos fournisseurs. La mise en place est offerte avec l’offre Pro annuelle.' },
          { q: `Avez-vous une offre pour les grands réseaux${NB}?`, a: 'Oui. L’offre Entreprise inclut utilisateurs et dépôts illimités, un interlocuteur dédié, un SLA et la reprise de données.' },
        ],
      },
    },
  },
};

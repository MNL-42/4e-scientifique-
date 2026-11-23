# SCIENCE 4 — Le campus de la classe

PWA destinée à la classe de 4e Scientifique en République démocratique du Congo.

## Structure

- `index.html` : pages et structure de l'application.
- `styles.css` : système visuel responsive.
- `app.js` : navigation et interactions de l'interface.
- `manifest.webmanifest` : configuration d'installation PWA.
- `sw.js` : cache de l'application pour une ouverture hors connexion.
- `supabase/schema.sql` : base de départ pour le futur backend (à compléter avant production).

## Aperçu local

Ouvrir `index.html` dans un navigateur pour vérifier l'interface. Pour tester l'installation PWA et le service worker, publier le site en HTTPS (par exemple GitHub Pages).

## État actuel

Cette première livraison est un socle frontend fonctionnel :
- navigation entre les espaces ;
- affichage des rubriques ;
- recherche et filtre de matières (la bibliothèque reste vide tant que les cours ne sont pas importés) ;
- profil local de démonstration ;
- création de brouillons SOS sur l'appareil ;
- défi mathématique interactif ;
- cache de l'application.

Les discussions, comptes partagés, rôles professeur, publications de devoirs, stockage de scans/PDF, notifications partagées et synchronisation ne sont pas encore connectés à Supabase. L'interface l'indique explicitement : aucune conversation ou archive fictive n'est affichée.

## Publication GitHub Pages

Dans le dépôt GitHub : **Settings → Pages → Deploy from a branch → main → /(root) → Save**. Après le déploiement, l'adresse sera :

https://mnl-42.github.io/4e-scientifique-/

## Sécurité avant Supabase

Ne jamais placer une clé `service_role` dans le navigateur. Les rôles professeur/administrateur doivent être attribués côté serveur et protégés par RLS. Le préfixe `@` dans un nom ne constitue pas une preuve de rôle.
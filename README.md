# SCIENCE 4 — Le campus de la classe

Plateforme de travail et d'entraide destinée à la 4e Scientifique en République démocratique du Congo.

## Fichiers

- `index.html` : pages et structure.
- `styles.css` : interface responsive.
- `app.js` : navigation, défis, profil, discussions et espaces partagés.
- `manifest.webmanifest` : configuration d'installation en mode autonome.
- `sw.js` : cache de l'interface et des illustrations pour le mode hors connexion.
- `assets/` : icône et illustrations originales de SCIENCE 4.
- `supabase-config.js` : URL et clé publique du projet Supabase à renseigner.
- `supabase/schema.sql` : schéma initial, règles RLS et bucket privé pour les documents.
- `.github/workflows/deploy-pages.yml` : déploiement automatique GitHub Pages.

## Publication et installation PWA

1. Dans GitHub, ouvrir **Settings → Pages**.
2. Choisir **GitHub Actions** comme source de déploiement.
3. Vérifier l'exécution du workflow **Deploy SCIENCE 4 to GitHub Pages** dans l'onglet Actions.
4. Ouvrir l'URL Pages en HTTPS sur Android.
5. Utiliser le bouton **Installer l'application** du site ou le menu du navigateur, puis **Installer l'application / Ajouter à l'écran d'accueil**.

Une PWA installée s'ouvre en mode autonome, sans barre d'adresse du navigateur. Un site web ordinaire ne peut pas forcer le plein écran sans action de l'utilisateur. Le navigateur décide aussi quand proposer son invite d'installation.

## Configuration Supabase

1. Le projet **NACRE** est déjà relié dans `supabase-config.js` avec son URL et sa clé publishable publique.
2. Dans le tableau de bord NACRE, ouvrir **Authentication → Sign In / Providers** et activer **Anonymous Sign-Ins**. Cette option doit être activée pour que l'inscription sans e-mail fonctionne.
3. Le schéma `supabase/schema.sql` a été installé dans NACRE. Il crée les profils, discussions, SOS et réponses, devoirs, annonces, ressources, entraînements et les buckets privés `science4-documents` et `science4-sos-images`.
4. Les tables sont protégées par RLS et les flux de discussion, SOS et devoirs sont inscrits dans Realtime.
5. Les comptes anonymes restent liés à l'appareil/navigateur : effacer les données du navigateur ou changer d'appareil peut faire perdre l'accès au compte.

### Valider le premier professeur

Un nom commençant par `@` ou le choix « Professeur — à valider » envoie une demande, mais ne donne pas automatiquement les droits professeur.

Dans le SQL Editor de NACRE, repérer la demande :

```sql
select id, display_name, requested_teacher
from public.class_profiles
where requested_teacher = true;
```

Après vérification de l'identité du professeur, l'administrateur valide son UUID :

```sql
update public.class_profiles
set role = 'teacher', teacher_status = 'approved'
where id = 'UUID_DU_PROFESSEUR';
```

Ne jamais rendre le rôle professeur automatique à partir du seul caractère `@`, car n'importe quel élève pourrait se faire passer pour un enseignant.

**Ne jamais mettre une clé `service_role` ou `sb_secret` dans le site.**

## Comptes et sécurité

- Les élèves enregistrent uniquement leur nom, post-nom et prénom, sans adresse e-mail ni mot de passe. Un `@` au début de l’un des champs demande un accès professeur, qui reste soumis à validation.
- Un `@` au début de l’un des trois champs de nom signale une demande d’accès professeur, mais ne donne pas automatiquement les droits.
- L'administration doit valider un enseignant en attribuant le rôle `teacher` et le statut `approved` dans `class_profiles`.
- Les politiques RLS limitent les publications pédagogiques aux enseignants approuvés.
- Les comptes anonymes sont pratiques pour démarrer, mais ne sont pas récupérables après effacement des données locales. Prévoir un moyen de rattacher un compte durable avant un usage à grande échelle.

## État des fonctionnalités

**Interface disponible :** navigation responsive, matières, profil, défis originaux, EXETAT, espace professeur, SOS avec photo et réponses, chat par matière, devoirs avec suivi personnel, annonces partagées et dépôt de PDF.

**Fonctionnalités qui nécessitent encore la configuration du projet Supabase :** comptes anonymes partagés, chat temps réel, flux SOS partagé, devoirs partagés, bibliothèque PDF et autorisations professeur. Aucun message ou document fictif n'est affiché.

## Documents de cours

Les PDF seront ajoutés progressivement à partir des scans des cahiers de cours de la classe. Les documents n'apparaîtront dans la bibliothèque qu'après leur dépôt et leur publication.

## EXETAT et ressources

Les actualités renvoient aux sources institutionnelles et affichent leur date. Les séries d'entraînement de l'application sont des questions originales de révision, pas des reproductions présentées comme des sujets officiels. Avant de publier un ancien questionnaire intégral, vérifier sa provenance et les conditions de réutilisation.

Source institutionnelle : https://www.edu-nc.gouv.cd/

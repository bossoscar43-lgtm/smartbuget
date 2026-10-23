# SmartBudget — PayControl

Application web de gestion de budget personnel, 100 % statique (HTML/CSS/JS), sans build.
Elle fonctionne immédiatement en **mode démo local** et bascule automatiquement sur
**Supabase** dès que les clés sont renseignées.

![Statut](https://img.shields.io/badge/build-aucun-2f8f72) ![Mode](https://img.shields.io/badge/d%C3%A9mo-local-5b7cf5) ![Cloud](https://img.shields.io/badge/cloud-Supabase-3baa8c)

## Fonctionnalités

- **Authentification** : email / mot de passe, inscription, réinitialisation, écran de nouveau mot de passe, OAuth Google & Apple via Supabase.
- **Profil** : nom, email (démo), devise (10 devises), jour de paie, thème clair/sombre.
- **Revenus** : revenus ponctuels et récurrences mensuelles matérialisées automatiquement.
- **Dépenses** : fixes ou variables, catégories personnalisables, échéances, factures à venir, statut payé / à payer.
- **Budget 50/30/20** : enveloppes calculées sur les revenus du mois, pourcentages ajustables (somme contrôlée à 100 %).
- **Épargne** : objectifs, contributions, progression, date estimée d’atteinte.
- **Simulateur « Puis-je me l’offrir ? »** : verdict, marge restante, impact quotidien, effet sur l’enveloppe envies.
- **Tableau de bord** : score de santé budgétaire, reste à vivre quotidien, compte à rebours avant paie, graphiques SVG.
- **Statistiques** : six mois d’historique, répartition par catégorie, taux d’épargne.
- **Exports** : CSV (compatible Excel, séparateur `;`, BOM UTF-8), JSON complet, bilan PDF via l’impression navigateur.
- **Accessibilité & responsive** : navigation clavier, libellés ARIA, tiroir mobile, respect de `prefers-reduced-motion`.

## Démarrage rapide (démo)

Aucune installation, aucun compte, aucun réseau nécessaire.

```bash
python -m http.server 8000 --directory smartbudget
```

Ouvrir <http://localhost:8000>, puis **Essayer la démo gratuite**.

> Un simple double-clic sur `index.html` fonctionne aussi, mais un serveur local est
> recommandé pour éviter les restrictions `file://` et tester les redirections Supabase.

La démo contient trois mois de données réalistes. Elle est stockée dans le navigateur :

| Clé `localStorage` | Contenu |
| --- | --- |
| `smartbudget.demo.v3` | Profil, catégories, revenus, dépenses, objectifs, contributions |
| `smartbudget.session.v3` | Session de démonstration |
| `smartbudget.theme` | Thème clair / sombre |

Le bouton **Réinitialiser la démo** restaure les données d’origine.

## Activer Supabase

### 1. Créer le projet

1. Créer un projet sur <https://supabase.com>.
2. Récupérer l’**URL du projet** et la **clé publique `anon`** dans
   *Project Settings → API*.
3. Renseigner `smartbudget/assets/config.js` :

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://votre-projet.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
  DEMO_MODE: true
};
```

> N’utilisez **jamais** la clé `service_role` dans le navigateur. Seule la clé `anon`
> est nécessaire ; les politiques RLS protègent les données.

### 2. Appliquer le schéma

Dans le *SQL Editor* de Supabase, exécuter le fichier :

```text
smartbudget/supabase/migrations/20261023120000_smartbudget.sql
```

Ou avec la CLI Supabase :

```bash
supabase link --project-ref <votre-ref>
supabase db push
```

La migration crée :

- les tables `profiles`, `categories`, `recurring_incomes`, `incomes`,
  `recurring_expenses`, `expenses`, `savings_goals`, `savings_contributions` ;
- les contraintes, index et index uniques anti-doublons sur les occurrences récurrentes ;
- le trigger d’inscription qui crée le profil et les 11 catégories par défaut ;
- la synchronisation automatique de `savings_goals.current_amount` avec les contributions ;
- les politiques **Row Level Security** (chaque utilisateur ne voit que ses données) ;
- la fonction RPC `delete_my_account()`.

### 3. Configurer l’authentification

Dans *Authentication → URL Configuration* :

- **Site URL** : `https://votre-domaine.com`
- **Redirect URLs** :
  - `https://votre-domaine.com`
  - `http://localhost:8000`
  - l’URL de prévisualisation de votre hébergeur si besoin

Pour Google / Apple, activer les fournisseurs dans *Authentication → Providers* et
renseigner les identifiants OAuth. Sans configuration OAuth, les boutons restent
visibles mais affichent un message explicite.

### 4. Vérifier le mode cloud

Après rechargement, l’app affiche « Cloud Supabase » dans le profil. Créez un compte :
le trigger doit générer automatiquement le profil et les catégories. En cas de profil
manquant pour un utilisateur existant, l’application crée une ligne de secours ; il peut
être nécessaire d’ajouter manuellement les catégories dans ce cas.

## Structure du projet

```text
smartbudget/
├── index.html                  # landing + point d’entrée de l’application
├── legal.html                  # mentions légales, confidentialité, sécurité, cookies
├── assets/
│   ├── config.js               # clés Supabase et options
│   ├── core.js                 # utilitaires, démo, adaptateur Supabase, moteur de calcul
│   ├── ui.js                   # composants (icônes, modales, graphiques, champs)
│   ├── views.js                # toutes les vues et modales de formulaire
│   ├── app.js                  # routeur, coquille, actions, exports, thème
│   └── app.css                 # design system, landing, app, responsive, impression
└── supabase/
    └── migrations/
        └── 20261023120000_smartbudget.sql
```

Aucun bundler, aucun `npm install`. Les scripts sont chargés dans cet ordre :
`config.js` → `core.js` → `ui.js` → `views.js` → `app.js`.

## Modèle de données

| Table | Rôle | Champs principaux |
| --- | --- | --- |
| `profiles` | Préférences utilisateur | `currency`, `payday_day`, `theme`, `needs_pct`, `wants_pct`, `savings_pct` |
| `categories` | Catégories personnalisées | `name`, `envelope`, `icon`, `color` |
| `recurring_incomes` | Modèles de revenus mensuels | `amount`, `type`, `day_of_month`, `active` |
| `incomes` | Revenus du mois | `amount`, `received_at`, `month_key`, `recurring_id`, `skipped` |
| `recurring_expenses` | Modèles de charges mensuelles | `amount`, `envelope`, `day_of_month`, `active` |
| `expenses` | Dépenses du mois | `amount`, `due_date`, `is_fixed`, `is_paid`, `month_key`, `recurring_id` |
| `savings_goals` | Objectifs d’épargne | `target_amount`, `current_amount`, `target_date` |
| `savings_contributions` | Versements | `goal_id`, `amount`, `contributed_at`, `month_key` |

Les récurrences sont matérialisées à la demande par `DB.ensureMonth()` : une ligne est
créée par modèle et par mois, avec un index unique côté PostgreSQL pour éviter les
doublons. Supprimer une occurrence la marque `skipped = true` sans toucher au modèle.

## Sécurité

- RLS activée sur les huit tables ; chaque politique compare `user_id` à `auth.uid()`.
- Le profil est limité à `id = auth.uid()`.
- La suppression de compte passe par `delete_my_account()`, fonction `security definer`
  qui vérifie `auth.uid()` et supprime l’utilisateur `auth.users` (cascade sur les données).
- Aucun secret n’est présent dans le dépôt. `config.js` ne contient que l’URL publique et
  la clé `anon`.
- Les entrées utilisateur sont échappées avant injection dans le DOM (`esc()`).
- Les exports sont générés localement ; aucune donnée ne transite par un serveur tiers.

## Déploiement

Le dossier est entièrement statique. Exemples :

- **GitHub Pages** : publier le contenu de `smartbudget/` à la racine du site.
- **Netlify / Vercel / Cloudflare Pages** : *build command* vide, *output directory*
  `smartbudget` (ou racine si le dossier est publié seul).
- **N’importe quel hébergement statique** : envoyer `index.html`, `legal.html` et `assets/`.

Pensez à mettre à jour `SUPABASE_URL`, `SUPABASE_ANON_KEY` et les *Redirect URLs* avec le
domaine de production.

## Dépannage : « Database error saving new user »

Cette erreur vient du trigger `auth.users` qui initialise le profil. Elle est souvent
causée par une ancienne table `profiles` déjà présente sans les colonnes SmartBudget
(`email`, `currency`, `payday_day`, etc.). Exécuter une seule fois le correctif dans le
*SQL Editor* Supabase :

```text
smartbudget/supabase/migrations/20261023130000_fix_signup_trigger.sql
```

Le trigger ne bloque plus la création du compte : en cas d'échec de l'initialisation,
l'application crée automatiquement le profil et les 11 catégories à la première
connexion. Réessayer ensuite l'inscription.

Pour vérifier que le trigger est bien en place :

```sql
select tgname, proname
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal;
```

## Limites connues

- En mode démo, l’email et le mot de passe sont simulés : n’importe quel mot de passe est
  accepté, et les données restent locales à ce navigateur.
- Les boutons OAuth ne fonctionnent qu’en mode cloud configuré.
- L’export PDF utilise la boîte d’impression du navigateur (« Enregistrer au format PDF »).
- Les graphiques sont générés en SVG natif, sans dépendance externe.
- L’application n’est pas un conseil financier ; les projections sont indicatives.

## Licence

Projet personnel SmartBudget — PayControl. Les données saisies restent la propriété de
l’utilisateur. Voir `legal.html` pour les mentions légales et la politique de
confidentialité.

# Guide de Déploiement Vercel & Supabase 🇲🇬

Ce projet est conçu pour être un **Pur Single-Page Application (SPA) Frontend**, ce qui permet de le déployer instantanément sur **Vercel** sans le moindre serveur Node.js ni contraintes d'API routes. 

La persistance des matchs, de l'authentification et des statuts Premium s'appuie directement sur **Supabase** via son SDK client unifié.

---

## Étape 1 : Mettre en place la Base de Données Supabase

1. Créez un projet gratuit sur [Supabase](https://supabase.com).
2. Rendez-vous dans l'onglet **SQL Editor** de votre tableau de bord Supabase.
3. Copiez-collez l'intégralité du contenu du fichier `/supabase/schema.sql` et cliquez sur **Run**.
   *  *Cela va créer automatiquement les tables `profiles`, `matches`, `payments` et `custom_teams` dotées de polices de sécurité RLS restrictives.*

---

## Étape 2 : Déployer l'Edge Function pour les Webhooks Papi.mg

Papi.mg envoie des notifications d'événements de paiement sécurisées sur les serveurs de votre application. Nous gérons cela via une **Supabase Edge Function** serveur-autoritative :

1. Installez la CLI Supabase sur votre machine locale si ce n'est pas déjà fait :
   ```bash
   npm i -g supabase
   ```
2. Connectez-vous à votre compte Supabase :
   ```bash
   supabase login
   ```
3. Initialisez l'association avec votre projet contenant l'id de projet :
   ```bash
   supabase link --project-ref votre_id_projet_supabase
   ```
4. Déployez la fonction de webhook :
   ```bash
   supabase functions deploy papi-webhook
   ```
5. Votre URL finale de webhook à renseigner dans la console Papi.mg sera :
   ```text
   https://votre_id_projet_supabase.supabase.co/functions/v1/papi-webhook
   ```

---

## Étape 3 : Configurer Vercel et les Variables d'Environnement

Lors du déploiement de votre application sur **Vercel**, ajoutez simplement ces deux variables d'environnement dans l'onglet de configuration de votre projet :

* `VITE_SUPABASE_URL` : L'URL de votre projet Supabase (ex: `https://xxxxxx.supabase.co`)
* `VITE_SUPABASE_ANON_KEY` : La clé publique temporaire Anon Key fournie par Supabase.

---

### Fallback d'Aperçu (AI Studio)

Si ces clés ne sont pas encore déclarées, le moteur de l'application bascule automatiquement sur un **moteur de simulation persisté localement (LocalStorage)** pour vous garantir une démonstration fluide et fonctionnelle à 100 % au moment du développement et de la présentation !

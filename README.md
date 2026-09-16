# Il Mister

Versione full-stack di "Il Mister": chat IA a tema calcio, quiz generato dall'IA e classifica
Serie A aggiornata automaticamente ogni giorno. A differenza del prototipo (un singolo artifact
HTML lato client), qui login, quota giornaliera e abbonamento sono verificati e applicati **lato
server**.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **PostgreSQL** + **Prisma**
- **NextAuth (Auth.js v4)** — login email/password e magic link, sessioni JWT
- **Claude API** (`@anthropic-ai/sdk`) — chat streaming + quiz con output strutturato (Zod)
- **Stripe** — abbonamento Premium a 2,99€/mese
- **football-data.org** — dati classifica Serie A, aggiornati da un job pianificato

## Funzionalità e come sono implementate

| Requisito | Implementazione |
|---|---|
| Login reale (email/password o magic link) | `src/lib/auth.ts` — `CredentialsProvider` (bcrypt) + `EmailProvider` (magic link) con `PrismaAdapter` |
| 5 domande gratuite/giorno, non aggirabili | `src/lib/quota.ts` — contatore atomico in Postgres per utente, chiave `userId + data (Europe/Rome)`. Verificato in `api/chat` e `api/quiz` prima di chiamare Claude; cancellare i cookie/localStorage non ha alcun effetto perché lo stato vive nel database |
| Abbonamento Premium 2,99€/mese via Stripe | `api/billing/checkout` (Stripe Checkout), `api/billing/webhook` (aggiorna lo stato abbonamento), `api/billing/portal` (gestione/cancellazione) |
| Sblocco automatico dopo il pagamento | Il webhook `checkout.session.completed` / `customer.subscription.updated` scrive lo stato su `Subscription.status`; `isPremium()` lo legge ad ogni richiesta, quindi l'accesso illimitato scatta subito dopo il pagamento, senza bisogno di ri-login |
| Aggiornamento classifica alle 23:59 Europe/Rome | `src/lib/standings.ts` + `api/cron/update-standings` + `vercel.json` (due cron UTC per coprire ora legale/solare, idempotente per giorno) |

## Setup locale

```bash
npm install
cp .env.example .env   # compila le variabili (vedi sotto)
npm run db:migrate     # crea le tabelle su Postgres
npm run dev
```

Requisiti: un database Postgres raggiungibile da `DATABASE_URL`.

### Variabili d'ambiente

Vedi `.env.example` per l'elenco completo. Note:

- **Magic link senza SMTP configurato**: il link di accesso viene stampato nel log del server
  invece di essere inviato via email — comodo in sviluppo, da configurare con un vero SMTP
  (es. Resend, Postmark, SES) in produzione.
- **`STRIPE_PRICE_ID`**: crea il prodotto/prezzo ricorrente da 2,99€/mese su Stripe (dashboard o
  CLI), oppure esegui `npm run stripe:bootstrap` (richiede solo `STRIPE_SECRET_KEY`) per crearlo
  automaticamente e stampare l'id da copiare in `.env`.
- **`STRIPE_WEBHOOK_SECRET`**: in locale, `stripe listen --forward-to localhost:3000/api/billing/webhook`.
- **`FOOTBALL_DATA_API_KEY`**: chiave gratuita da [football-data.org](https://www.football-data.org/).
- **`CRON_SECRET`**: segreto condiviso con il servizio di scheduling (vedi sotto).

## Job pianificato (classifica Serie A)

`api/cron/update-standings` richiede l'header `Authorization: Bearer <CRON_SECRET>` (formato
standard di Vercel Cron) oppure `x-cron-secret: <CRON_SECRET>`.

`vercel.json` programma due chiamate UTC (21:59 e 22:59) per coprire sia l'ora legale sia quella
solare di Europe/Rome, dato che i cron non esprimono fusi orari nativamente. L'handler stesso
verifica che sia effettivamente sera in Italia e salta l'esecuzione se è già stato aggiornato lo
snapshot del giorno corrente — quindi è sicuro anche se entrambi gli orari, o un cron esterno con
un minuto diverso, dovessero attivarlo.

Su un'infrastruttura diversa da Vercel (GitHub Actions, cron-job.org, ecc.) basta chiamare
`GET/POST /api/cron/update-standings` con l'header sopra un paio di volte nella finestra
21:00–23:59 UTC.

## Note di sicurezza sulle dipendenze

`npm audit` segnala advisory transitive su `nodemailer` (usato solo per inviare il magic link a
un singolo indirizzo già validato, senza le opzioni coinvolte nelle CVE — nessuna versione
corretta è ancora disponibile a monte) e su `postcss` (impacchettato internamente da Next.js per
l'elaborazione del CSS del progetto, non esposto a input esterni). Non ci sono fix disponibili
senza un salto di major version con breaking change rilevanti; da rivalutare quando saranno
pubblicate patch upstream.

## Deploy (Vercel)

Il comando di build (`npm run build`) esegue automaticamente `prisma generate` e
`prisma migrate deploy` prima di `next build`: ad ogni deploy le migrazioni vengono applicate al
database di produzione, non serve eseguirle a mano. L'unico requisito è che `DATABASE_URL` sia
raggiungibile pubblicamente da Vercel (vero per Neon, Supabase, Vercel Postgres, ecc.).

### 1. Crea i servizi esterni

| Servizio | Cosa serve | Dove |
|---|---|---|
| Database Postgres | `DATABASE_URL` | [Neon](https://neon.tech) (gratuito) o [Vercel Postgres](https://vercel.com/storage/postgres) |
| Claude API | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | [dashboard.stripe.com](https://dashboard.stripe.com) — vedi sotto |
| Classifica Serie A | `FOOTBALL_DATA_API_KEY` | [football-data.org](https://www.football-data.org/client/register) (piano gratuito) |
| Magic link (opzionale) | `EMAIL_SERVER_*`, `EMAIL_FROM` | un provider SMTP qualsiasi (Resend, Postmark, SES...) |

Per Stripe: crea il prodotto/prezzo da 2,99€/mese o con `npm run stripe:bootstrap`
(basta `STRIPE_SECRET_KEY` in locale) — stampa l'id da usare come `STRIPE_PRICE_ID`.
`STRIPE_WEBHOOK_SECRET` si ottiene al passo 4, dopo aver creato il progetto su Vercel (serve
l'URL del dominio, che si conosce solo dopo il primo deploy).

### 2. Importa il repository su Vercel

1. Vai su [vercel.com/new](https://vercel.com/new) e importa
   `giacomovalentinia-jpg/Giac-repository`.
2. Vercel rileva automaticamente Next.js — non serve toccare i comandi di build.
3. **Prima del primo deploy**, in "Environment Variables" aggiungi tutte le variabili di
   `.env.example` tranne `STRIPE_WEBHOOK_SECRET` (arriva dopo) e `NEXTAUTH_URL`, che imposti al
   dominio assegnato da Vercel una volta noto (es. `https://il-mister.vercel.app`) — puoi anche
   lasciarlo vuoto e completarlo subito dopo il primo deploy con un redeploy.
4. Genera `NEXTAUTH_SECRET` con `openssl rand -base64 32` e incollalo come variabile.
5. Avvia il deploy.

### 3. Dopo il primo deploy

1. Copia l'URL assegnato da Vercel, impostalo come `NEXTAUTH_URL` (env var) e ridistribuisci
   (redeploy) se non l'avevi già impostato.
2. Su Stripe, crea un webhook endpoint verso `https://<il-tuo-dominio>/api/billing/webhook`,
   eventi `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`. Copia il "Signing secret" in
   `STRIPE_WEBHOOK_SECRET` su Vercel e ridistribuisci.
3. Verifica in **Project → Settings → Cron Jobs** che i due job su
   `/api/cron/update-standings` (21:59 e 22:59 UTC) siano attivi — `vercel.json` li registra da
   solo, non serve configurarli a mano.

### 4. Verifica finale

- Registrati sull'app, controlla che il login funzioni e che il badge mostri "5/5 domande
  gratuite oggi".
- Esaurisci le 5 domande e verifica il messaggio di limite raggiunto.
- Completa un pagamento di test (Stripe in modalità test, carta `4242 4242 4242 4242`) e verifica
  che il badge passi a "⭐ Premium" senza dover rifare il login.
- Forza un aggiornamento della classifica per verificare l'integrazione con football-data.org:
  `curl -X POST https://<dominio>/api/cron/update-standings?force=true -H "x-cron-secret: <CRON_SECRET>"`.

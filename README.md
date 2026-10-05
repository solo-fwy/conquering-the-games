# Conquering The Games

A runnable galaxy-themed gaming community + marketplace starter.

## Included
- Account registration/login with bcrypt password hashing
- Session cookies
- User profiles/roles
- Discord-style direct messaging UI
- Product marketplace
- Local cart
- Order creation/history
- Admin dashboard
- Product management
- SQLite database
- Responsive galaxy/neon UI

## Run locally

1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm start
```

4. Open http://localhost:3000

## Demo admin
Username: `admin`
Password: `ChangeMe123!`

Change the admin password before deploying.

## Production notes
This is a starter, not a finished production commerce platform. Before taking real payments or deploying publicly:
- Replace SESSION_SECRET with a strong random secret.
- Add HTTPS.
- Connect Stripe/PayPal for actual payment processing.
- Add email verification/password reset.
- Add CSRF protection and stronger validation.
- Add moderation/report/block tools for messaging.
- Add proper database backups.
- Add an age/terms/privacy flow appropriate to your service.
- Review every marketplace listing for legality and game/platform terms.
- Do not sell compromised/stolen accounts or cheating/exploit services.

## Suggested next upgrades
- Discord OAuth
- Friends/presence system
- Group servers/channels
- Stripe Checkout + webhooks
- Product image uploads
- Reviews/ratings
- Search/filtering
- Admin moderation tools
- 2FA
- Docker deployment

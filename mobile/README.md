# OMSUN Mitra

The retailer app for OMSUN E-Seva Kendra partners, in Marathi and English. Built with Expo (React Native) and Expo Router, on the same Supabase project as the admin app.

## What a retailer can do

- Sign up, enter shop details and wait for OMSUN to approve the shop (the office approves it in the admin app under Retailers).
- See the service list with prices, their commission and the document checklist.
- Send a new request: pick or add a customer, pick a service, attach documents from the camera, gallery or a PDF, and submit.
- Track each request live: status timeline, messages from OMSUN, upload missing documents, cancel while it is still new, and open the finished document.
- See earnings: commission on hold, earned and settled, the amount due to OMSUN, and monthly settlements.
- Read notifications and switch between मराठी and English (saved on their profile).

The database enforces every rule (see `docs/stage1-spec.md`); the app only uses the publishable key.

## Run it

```bash
cd mobile
npm install
npx expo start          # scan the QR code with Expo Go on an Android phone
npx expo start --web    # browser preview
```

Checks: `npm run typecheck` and `npm run lint`. The database rules the app relies on are covered by `tests/db/mitra-app-test.sql` (run `scripts/test-db.sh`).

## Build an Android app

Builds run on Expo's servers (free account needed):

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview      # installable APK for testing
npx eas-cli@latest build --platform android --profile production   # Play Store bundle
```

## Settings

`src/lib/config.ts` holds the Supabase URL and publishable key. To point at another project, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`. Set `EXPO_PUBLIC_OFFICE_PHONE` to show a "Call OMSUN Office" button. Never put the service-role key in the app.

## Not yet

- Login with mobile OTP. It needs an SMS provider connected in Supabase (for example MSG91 or Twilio); until then retailers use email and password.
- Push notifications (in-app notifications work now).
- Marathi text was drafted by Claude and needs a review by the OMSUN team (`src/lib/i18n.tsx`).

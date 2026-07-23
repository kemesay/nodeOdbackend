# Square Payments (Web + Android + iOS)

## Credentials (backend — one module)

| What | Where |
|------|--------|
| **Config module** | `src/config/squareCredentials.js` (values) |
| **Import in code** | `require("../config/square.js")` → `getSquareCredentials()`, `getSquarePublicConfig()`, `getSquareClient()` |
| **Env template** | `square.env.example` → copy into `.env` |

**Sandbox variables**

| Credential | Env variable |
|------------|----------------|
| Access token (secret) | `SQUARE_SANDBOX_ACCESS_TOKEN` |
| Application ID (public) | `SQUARE_SANDBOX_APPLICATION_ID` |
| Location ID (public) | `SQUARE_SANDBOX_LOCATION_ID` |
| Webhook signature key (secret) | `SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY` |
| Webhook URL (optional) | `SQUARE_SANDBOX_WEBHOOK_NOTIFICATION_URL` |

**Production:** same names with `SQUARE_PRODUCTION_*` prefix.

**Switch sandbox → production:** set `SQUARE_ENV=production` in `.env`, fill `SQUARE_PRODUCTION_*` values, restart the server. No code changes.

---

This backend supports Square **client-side tokenization** (Web Payments SDK / In-App Payments SDK) and **server-side charge** (Square Payments API).

## Public config (clients must call first)

`GET /api/v1/payments/square/config`

Response (example):

```json
{
  "squareEnabled": true,
  "applicationId": "...",
  "locationId": "...",
  "environment": "sandbox",
  "paymentProvider": "square",
  "paymentMode": "authorize_capture"
}
```

Clients use `applicationId`, `locationId`, and `environment` to initialize Square SDK.

## Payment methods supported by booking APIs

- `SQUARE_NEW_CARD`: pay using a **token/nonce** produced by Square SDK tokenization
- `PRIMARY_CARD`: pay using user's primary saved card (`payment_details.squareCardId`)
- `EXISTING_CARD`: pay using an existing saved payment method by `paymentDetailId`
- `SQUARE_SAVED_CARD`: pay using an explicit `squareCardId` (Square card-on-file id)

## Booking create (pay at booking time)

All booking-create endpoints ultimately call `processBookingPayment(...)`.

### A) Pay with a new card (Android/iOS In-App Payments SDK or Web SDK)

Request fields (payment portion):

```json
{
  "paymentMethod": "SQUARE_NEW_CARD",
  "square": {
    "sourceId": "NONCE_OR_TOKEN_FROM_SQUARE_SDK",
    "verificationToken": "OPTIONAL_BUYER_VERIFICATION_TOKEN"
  }
}
```

Server behavior:

- Creates a Square payment via Payments API using `square.sourceId`
- Records ledger row in `payment_transactions`
- Sets booking `paymentStatus` based on `PAYMENT_MODE`:
  - `charge_immediate` → `PAID` (charged at booking)
  - `authorize_capture` / `authorize` / `charge_on_take` → `AUTHORIZED` (hold only; **not charged yet**)

## Admin payment flow (accept vs take payment)

| Step | Endpoint | Square action |
|------|----------|---------------|
| Customer books | `POST .../hourly-charter-books` (etc.) | **Authorize** hold on card (`autocomplete: false`) |
| Admin accepts trip | `POST /api/v1/admin/bookings/approve` | **No charge** — booking status only; `paymentStatus` stays `AUTHORIZED` |
| Admin takes payment | `POST /api/v1/admin/bookings/update-payment-status` | **Capture** authorized funds → `paymentStatus: PAID` |
| Admin rejects/cancels | `POST /api/v1/admin/bookings/approve` (reject) | **Cancel** authorization or **refund** if already captured |

Take-payment request body:

```json
{
  "bookingId": 123,
  "bookingType": "HOURLY"
}
```

If no authorization exists (e.g. booking edited or authorization canceled), take-payment charges the **saved card on file** with immediate capture.

**Card persistence:** After every successful Square payment (authorize or capture), the backend saves `squareCustomerId`, `squareCardId`, `cardBrand`, `last4`, `expMonth`, `expYear` into `payment_details` and links the booking to that row. If capture fails because the authorization was canceled, take-payment automatically charges the saved card instead.

Backfill cards for existing ledger rows:

```bash
npm run db:backfill-square-cards -- 174 HOURLY
```

**Env:** `PAYMENT_MODE=authorize_capture` (default) — authorize at booking, capture on take payment.

### B) Pay with a saved card

```json
{
  "paymentMethod": "PRIMARY_CARD"
}
```

or

```json
{
  "paymentMethod": "EXISTING_CARD",
  "paymentDetailId": 123
}
```

or

```json
{
  "paymentMethod": "SQUARE_SAVED_CARD",
  "squareCardId": "ccof:xxxxxxxxxxxxxxxx"
}
```

## Save card on file (recommended for 1-tap payments)

After mobile/web tokenization, call the backend endpoint that stores Square card-on-file metadata.

Request:

```json
{
  "sourceId": "NONCE_OR_TOKEN_FROM_SQUARE_SDK",
  "cardOwnerName": "John Doe",
  "zipCode": "12345",
  "isPrimary": true
}
```

Response includes `paymentDetailId` and card metadata (`cardBrand`, `last4`, `expMonth`, `expYear`, `squareCardId`).

## Database migration (local PostgreSQL or production MySQL)

```bash
npm run db:square-columns
```

The script picks SQL by dialect:

| Dialect | File |
|---------|------|
| PostgreSQL | `database/sql/add_square_payment_columns.sql` |
| MySQL / MariaDB | `database/sql/add_square_payment_columns.mysql.sql` (+ idempotent column/ENUM checks in the script) |

**Connect to production MySQL** (not `psql`; disable SSL if the server has no TLS):

```bash
mysql -h 192.249.113.151 -P 3306 -u odatra5_dev -p --skip-ssl odatra5_dev_db
```

Verify Square schema:

```sql
SHOW COLUMNS FROM payment_details LIKE 'square%';
SHOW TABLES LIKE 'payment_transactions';
SHOW COLUMNS FROM hourly_charter_books LIKE 'paymentMethod';
```

## Webhook (Square → backend)

`POST /api/v1/webhooks/square`

The app validates `x-square-hmacsha256-signature` against the raw request body and updates `payment_transactions.status`.

## Legacy raw PAN support (temporary)

By default, when Square is enabled, the backend **rejects** raw card details (`paymentMethod: NEW_CARD` with `cardDetails`).

If you must keep older clients temporarily (non-production only), set:

- `ALLOW_RAW_PAN_WITH_SQUARE=true`

This allows booking creation to proceed by saving a legacy `payment_details` row and returning `paymentStatus: AWAITING_PAYMENT`, but it **does not charge** with Square.


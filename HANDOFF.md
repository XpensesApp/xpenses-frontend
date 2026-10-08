# Handoff — Latest Backend Updates

Newest first. Field-by-field reference lives in `transactions-endpoint-handoff.md` (transactions + accounts) and `subscription_handoff.md`. Every request below is in `postman-collection.json`.

---

# 2026-10-07 — Credit card statements (built, **not deployed yet**)

Card purchases can now be split into installments ("cuotas"), and every credit card gets one pending payment per month, like a subscription.

## TL;DR: frontend action items

1. **Installment purchases:** create the purchase as usual (an `expense` with `accountId` = the card) and set `installments` to the number of cuotas. Leave it unset (or `1`) for a single payment. Send the **full** purchase amount; the backend splits it.
2. **Show the monthly statement:** it's a regular transaction in `GET /transactions` with a non-null `statement` field: a pending `transfer` from the default account into the card.
3. **Pay it:** `PUT` the statement with `amount` = what was actually paid (can be less or more than due), `pending: false` and `accountId` = the account it was paid from.
4. **Don't delete statements.** The job regenerates a deleted one on its next run. To skip a month, just leave it pending; it rolls into the next one.

## How it works

- **Purchase:** a full `expense` on the card at purchase time, so the card's `balance` shows the whole debt (`-120000` for a 120.000 TV in 12 cuotas).
- **Due date:** the card's `paymentDay` (clamped to the month's length). A purchase made **before** the due date is first billed on that due date; one made **on or after** it goes to the next month. Cuota *k* is billed on the *k*-th due date from there.
- **Each cuota:** the amount ÷ installments, rounded down to whole pesos (or to the amount's decimals), with the remainder on the last one. 100.000 in 3 → 33.333, 33.333, 33.334.
- **Statement amount** = this month's cuotas from every active purchase + whatever is still owed from the last statement.
- **Payments that count:** paying the statement, any other `transfer` into the card, and refunds (`income` on the card) between one statement and the next. Partial payments and overpayments carry over automatically. An overpayment becomes a credit that lowers the next statement.
- **An unpaid statement** is replaced by the next month's, which includes its full amount in `previousBalance`. A card only ever has one pending statement.
- **Generated daily at 03:15 Chile time.** If a run is missed, the next one catches up on the card's most recent due date.

## The statement transaction

```json
{
  "title": "Pago CMR 2026-11-04",
  "amount": "20500",
  "date": "2026-11-04",
  "type": "transfer",
  "pending": true,
  "affectsBalance": true,
  "accountId": "default",
  "targetAccountId": "5",
  "transactionId": "statement-5-2026-11-04",
  "billingPeriod": "2026-11",
  "statement": {
    "accountId": "5",
    "installmentsDue": "13000",
    "previousBalance": "7500",
    "amountDue": "20500",
    "lines": [
      { "transactionId": "…", "title": "TV", "date": "2026-09-10", "installment": 2, "installments": 12, "amount": "10000" },
      { "transactionId": "…", "title": "Biombo", "date": "2026-10-05", "installment": 1, "installments": 1, "amount": "3000" }
    ]
  }
}
```

- `statement` is **server-managed**. On `PUT`, a statement's `type`, `targetAccountId` and `statement` are always kept from the stored item, whatever you send. On `POST`, any `statement` you send is ignored.
- `statement.amountDue` can be negative (credit), in which case `amount` is `"0"`.
- `installment`/`installments` come back as numbers. The amounts are decimal strings like everywhere else.
- Every other transaction has `"statement": null`.

## Also fixed

- `PUT /transactions` and `POST /transactions` now ignore a client-sent `sk`; the key always comes from `date` + `transactionId`. Before, a mismatched `sk` could store the transaction under the wrong key.

## Postman

Three new requests, all of which work once this is deployed:

- **Accounts → Create Credit Card**: a `credit` account with `paymentDay: 5`, saved as `{{cardAccountId}}`.
- **Transactions → Create Installment Purchase**: a 120.000 `expense` on `{{cardAccountId}}` in 12 `installments`, so the card balance goes to `-120000`.
- **Transactions → Pay Card Statement**: settles a pending statement with its full `amountDue` from `{{accountId}}`. Lower the `amount` to try a partial payment.

The statement itself comes from the daily job, so it can't be created from Postman. "List Transactions" now remembers a pending statement if its page contains one. "Pay Card Statement" is skipped until a statement exists: the card needs a due date to pass after the purchase, and the list's date range needs to include that due date.

## When this is deployed

The first run catches up on each card's most recent due date. For CMR (`paymentDay` currently **4**), that's a pending **"Pago CMR 2026-10-04" for 143.887**, covering the 16 purchases from 2026-09-07 to 2026-10-01. If that bill was already paid outside the app, settle it with the real amount and source account; that also records the payment on the CMR balance.

---

# 2026-10-05 — Accounts, transfers, paging

All of this section is **deployed to prod** (`xpenses-backend-prod`).

---

## TL;DR: frontend action items

1. **Call `POST /auth/sync` after every login** (not just the first). It now also creates the user's default account.
2. **Replace `mockAccounts` with `GET /accounts`.** Accounts are real backend entities now, with live balances.
3. **Only send `accountId` / `targetAccountId` values that come from `GET /accounts`.** Unknown ids are rejected with `400`. Omit `accountId` to use the default account.
4. **`GET /transactions` no longer returns everything.** It returns the **last month, 50 per page**. Use `from`/`to` for other ranges, and `nextToken` for more pages.
5. **Show balances from `GET /accounts`**, never by summing transactions (you no longer get all of them).
6. **Handle the new `409`s** on transaction/account writes (reload + retry).
7. **Transfers are one transaction now:** `type: "transfer"` + `targetAccountId`, instead of an expense + an income.

---

## 1. Accounts (new)

Accounts moved from frontend mocks to the backend. Full CRUD under `/accounts`, protected by the same Cognito authorizer as transactions.

### Shape

```ts
type AccountType = "debit" | "credit" | "cash";

type Account = {
  email: string;
  accountId: string;        // stable reference used by transactions; generated by the backend
  name: string;
  type: AccountType;
  isSavings: boolean;       // default false
  paymentDay: number | null; // 1-31, only allowed when type is "credit"
  openingBalance: string;   // decimal string, default "0"
  // server-managed (ignored if you send them):
  balance: string;          // decimal string, can be negative; = openingBalance + settled transactions
  transactionCount: number; // transactions referencing this account
  isDefault: boolean;
  createdAt: string;        // ISO-8601 UTC
  updatedAt: string;
};
```

Compared to the frontend mock type: `id` → `accountId`, plus `openingBalance`, `balance`, `transactionCount`, `isDefault`, `createdAt`, `updatedAt`. `isSavings`/`paymentDay` are always present (`false`/`null` when unset).

Decimal strings (`balance`, `openingBalance`, `amount`) should be parsed as decimals, not floats. DynamoDB drops trailing zeros (`"650"`, not `"650.00"`).

### Endpoints

| | |
|---|---|
| `POST /accounts` | Create. Body: `name`, `type`, optional `isSavings`, `paymentDay`, `openingBalance`. `201` with the Account (`balance` starts at `openingBalance`). `400` on invalid fields. |
| `GET /accounts` | `{"accounts": [...]}`: all accounts in one response (no paging), default account first, then oldest first. |
| `PUT /accounts` | Full replace of the editable fields. Send `accountId` + **all** editable fields. Changing `openingBalance` shifts `balance` by the same difference; use that to match a real bank balance. `404` if missing, `409` on a concurrent change. |
| `DELETE /accounts?accountId=` | `400` for the default account. `409` while `transactionCount > 0`: move or delete its transactions first (pending ones count too). `404` if missing. |

### Default account

- Every user has exactly one account with `accountId: "default"` and `isDefault: true`. `POST /auth/sync` creates it as **"General" / `cash`**.
- It can be renamed/edited, but **never deleted**.
- Any transaction created **without** an `accountId` lands there, including the pending bills the daily subscription job generates.
- `POST /auth/sync` ensures it on **every** call, idempotently: it never resets a renamed default account or its balance.

### How balances move

Every transaction create/update/delete updates its accounts in the **same atomic write**, so after any successful response `GET /accounts` already reflects it. Only transactions with `affectsBalance: true` **and** `pending: false` move a balance:

| transaction `type` | effect |
|---|---|
| `expense` | `-amount` on `accountId` |
| `income` | `+amount` on `accountId` |
| `transfer` | `-amount` on `accountId`, `+amount` on `targetAccountId` |

Settling a pending transaction (`PUT` with `pending: false`) applies its effect at that moment. A credit card account (e.g. CMR) carrying debt shows a **negative** balance.

---

## 2. Transactions — changes

### Transfers (new `type`)

```json
{
  "title": "Move to savings",
  "amount": "200000",
  "categories": [],
  "date": "2026-10-05",
  "type": "transfer",
  "affectsBalance": true,
  "pending": false,
  "accountId": "6",
  "targetAccountId": "1"
}
```

- `type` is now `"expense"` | `"income"` | `"transfer"`.
- A transfer needs `targetAccountId` (must differ from `accountId`). `targetAccountId` on any other type is a `400`.
- Exclude transfers from expense/income totals: they net to zero overall.
- Subscriptions can't be transfers (`400`).

### `accountId` is always set now

- If you omit `accountId`, the transaction goes to `"default"`, and responses always include a non-null `accountId`.
- `accountId` and `targetAccountId` must belong to the user's existing accounts, otherwise `400 {"message": "Account '<id>' does not exist"}` and nothing is written.

### `GET /transactions` — date range + paging (breaking)

```
GET /transactions?from=2026-09-01&to=2026-09-30&limit=50&nextToken=...
```

| param | default |
|---|---|
| `to` | today (UTC), inclusive |
| `from` | one calendar month before `to`, inclusive (Mar 31 → Feb 28) |
| `limit` | 50 (max 200) |
| `nextToken` | cursor from the previous page |

Response:

```json
{
  "transactions": [ ... ],
  "dateRange": { "from": "2026-09-05", "to": "2026-10-05" },
  "nextToken": "MjAyNi0wOS0xNSM..."
}
```

- `nextToken` is `null` on the last page. When sending it back, send the **same** `from`/`to`; if you relied on the defaults, pass `dateRange.from`/`dateRange.to` explicitly so the range doesn't shift mid-paging.
- The last page can come back empty with `nextToken: null`.
- Future-dated transactions (e.g. upcoming installments) only appear if `to` is later than today.
- `400` on bad dates, `from` after `to`, a bad `limit`, or a `nextToken` from a different range.

### New error responses

| endpoint | new response |
|---|---|
| `POST /transactions` | `400` unknown account; `409` if you supplied a `transactionId` that already exists |
| `PUT /transactions` | `400` unknown account; `409` "changed or deleted by another request; reload it and retry" |
| `DELETE /transactions` | `409` same as above |

---

## 3. Subscriptions / daily billing

- Billed transactions now get `accountId: "default"` (still `pending: true`). When the user pays one, `PUT` it with the real amount, `pending: false` and the account it was paid from.
- The billing job **never overwrites** an existing transaction anymore. Before, rerunning it for a day could reset a bill the user had already settled back to pending.

---

## 4. Data migration (already done in prod)

- Accounts `"1"`–`"7"` were created for `jeanlopezcortes@gmail.com` with the **same ids, names and types as the frontend mocks**, so all existing transactions stay valid with no rewrite. CMR is `credit` with `paymentDay: 5`; Banco Estado ahorro vivienda has `isSavings: true`.
- Balances and transaction counts were rebuilt from the full history, starting from `openingBalance: "0"`:

| accountId | name | balance | transactions |
|---|---|---|---|
| `1` | Banco Estado ahorro vivienda | 1143000 | 1 |
| `2` | Banco de Chile cta corriente | 0 | 0 |
| `3` | Copec Pay debito | 2000000 | 2 |
| `4` | Mach debito | 1335572 | 2 |
| `5` | CMR | -146067 | 17 |
| `6` | Cuenta RUT | 277904 | 12 |
| `7` | Efectivo | 0 | 0 |
| `default` | General | 0 | 0 |

- **To do:** set each account's real `openingBalance` with `PUT /accounts` so `balance` matches the bank. New accounts created from now on get backend-generated ids (32-char hex), not `"1"`–`"7"`.

---

## 5. Backend-internal (no API impact)

- **New Accounts table** `xpenses-accounts-table-prod` (PK `email`, SK `accountId`), created outside the stack like the other tables.
- **Repo layout:** `api/` now only holds endpoint Lambdas. The authorizer moved to `authorizer/` and the daily billing job to `billing/`. That move goes live with the next `sam build` + `sam deploy`, with no behavior change.
- **Backfill/repair CLI:** `python layers/models/account.py <email> | --all` rebuilds balances and counts from transaction history.

---

## Postman

`postman-collection.json` covers all of the above. Create a Postman environment with `baseUrl` (the stack's `ApiUrl` output) and `authToken` (a Cognito ID token from `api/auth/sync/get_test_token.py`, valid for 60 minutes). Then run the folders in order:

1. **Auth** → Sync User (creates the default account)
2. **Accounts** → creates `{{accountId}}`, lists, updates, and demonstrates the delete rules
3. **Transactions** → create (on `{{accountId}}`), transfer (`{{accountId}}` → `default`), list + next page, update, delete
4. **Subscriptions**

A full run of Transactions leaves `{{accountId}}` at `openingBalance − 200` and the default account at `+200`: the expense is created, updated and deleted (net 0), and only the transfer remains.

# WhatsApp Cloud API setup guide (official Meta API only)

> This guide is for the academy owner / server administrator. Do not paste any
> token into the browser console, a source file, Git, chat, or a screenshot.

## 1. What the system uses

- Meta **WhatsApp Business Cloud API** (`graph.facebook.com`).
- A Meta-approved WhatsApp Business Account (WABA), a business phone number and
  approved message templates.
- A webhook endpoint on the API host (MonsterASP by default):
  `https://<api-domain>/api/whatsapp/webhook`.

The system does **not** use WhatsApp Web, browser automation, QR-code sessions,
or unofficial WhatsApp libraries.

## 2. Create the Meta assets

1. Go to <https://developers.facebook.com/apps> and create/select a Business app.
2. Add the **WhatsApp** product.
3. Connect the academy's official Facebook Business Portfolio and the official
   business phone number. Do not use a personal number that might be blocked.
4. Note:
   - **Phone Number ID** (WhatsApp → API Setup)
   - **WhatsApp Business Account ID** (WABA ID)
   - A **permanent System User access token** with `whatsapp_business_messaging`
     and `whatsapp_business_management` permissions. Do not use the temporary
     24-hour token in production.
5. Generate an **App Secret** (App Settings → Basic). The webhook signature
   check needs it.
6. Choose an API version. The default is `v21.0`; set it explicitly.

## 3. Create and get approval for templates

Business-initiated messages outside the customer service window require an
approved template. Create templates in Meta WhatsApp Manager with these
suggested internal categories:

| Internal category | Suggested Meta name | Meta category | Purpose |
| --- | --- | --- | --- |
| Welcome | `welcome_student_ar` | Utility/Marketing | New student welcome |
| Class reminder | `class_reminder_ar` | Utility | Class time reminder |
| Payment reminder | `payment_reminder_ar` | Utility | Due/overdue payment reminder |
| Lead follow-up | `lead_follow_up_ar` | Marketing | Lead follow-up |
| Thank you | `payment_thank_you_ar` | Utility | Full-payment thank you |

The payment reminder template must accept **5 positional variables** in this
order because the reminder worker sends them that way:

1. Student name
2. Course
3. Amount due
4. Due date (`YYYY-MM-DD`)
5. Payment instructions (cash/InstaPay/wallet/bank text configured in settings)

The thank-you template must accept **3 positional variables**:

1. Student name
2. Course
3. Academy name

If the approved template uses a different number/order of variables, update the
local template definition/settings so it matches. The worker rejects a mismatch
rather than guessing, and records the failure.

> Local `metaStatus` is only a cache. Before every campaign/reminder send the
> worker calls Meta and requires `APPROVED`. A template that exists locally but
> is pending/rejected is never reported as sent.

## 4. Environment variables

Add these on the API host (MonsterASP → Website → Environment variables; or the
server `.env` for local development). Never prefix them with `VITE_`.

```text
WHATSAPP_ACCESS_TOKEN=<permanent system-user token>
WHATSAPP_PHONE_NUMBER_ID=<phone number id>
WHATSAPP_BUSINESS_ACCOUNT_ID=<waba id>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<random long string you invent>
WHATSAPP_APP_SECRET=<app secret>
WHATSAPP_API_VERSION=v21.0
```

Optional worker tuning:

```text
PHASE2_WORKER_INTERVAL_MS=5000
```

After changing env vars, restart the MonsterASP application.

## 5. Configure the webhook in Meta

1. In the Meta app → WhatsApp → Configuration → Webhook:
   - Callback URL: `https://<api-domain>/api/whatsapp/webhook`
   - Verify token: exactly the value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
2. Subscribe to the `messages` field.
3. Save. Meta will send a GET challenge; the server echoes it only when the
   token matches.
4. Status callbacks (`sent`, `delivered`, `read`, `failed`) update the campaign
   history. Inbound STOP-style messages opt the recipient out automatically.

If `WHATSAPP_APP_SECRET` is missing, every POST webhook is rejected with 503.
Unsigned events are never trusted.

## 6. Add templates to the application

1. Sign in as admin → **المراسلة** → **القوالب**.
2. Create the four shared templates with Arabic bodies and the same variable
   names used by the editor:
   `{{student_name}}`, `{{course_name}}`, `{{class_schedule}}`, `{{amount_due}}`.
3. Enter the exact Meta template name and language, e.g. `payment_reminder_ar`
   / `ar`.
4. Click **تحقق من Meta** to confirm approval. The status becomes `approved`
   only when Meta says APPROVED.
5. In **الحسابات → الإعدادات**, set the payment reminder template name/language
   and (optionally) the thank-you template, and enable thank-you messages.

## 7. Configure payment instructions and prices

In **الحسابات → الإعدادات** enter the real academy details. Nothing is
pre-filled/invented:

- Cash working hours and location notes.
- InstaPay number and instructions.
- Wallet number and instructions.
- Bank name, account name, account number, IBAN and instructions.
- Course default prices (leave blank until approved).
- Sibling discount percentage (default 0%).
- Reminder days/time (default 3 days before, due day, 2 days overdue, 7 days
  overdue at 09:00 Africa/Cairo).
- Batch size/delay and retry limit.

## 8. Test the integration safely

1. Add the app's test phone numbers in Meta → API Setup.
2. Get explicit consent from five test recipients. Do not use real customers.
3. Send a test template to each test number from the admin bulk messaging screen.
4. Record the provider message IDs and delivery webhook events.
5. Check **سجل الحملات** for Sent/Delivered/Read/Failed.
6. If anything fails, the app records the Arabic error and never claims success.

## 9. What to send the implementation team

- Confirmation that the WABA and phone number are official.
- The exact approved template names/languages and their variable order.
- Five consenting test numbers (only for acceptance testing).
- Which roles may send campaigns and record payments.

Until these are supplied, live WhatsApp acceptance is **BLOCKED**, while the
integration architecture, validation, UI and mocked-provider tests are ready.

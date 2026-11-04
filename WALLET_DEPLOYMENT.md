# Bringo wallet: deployment gate

**Do not deploy these functions as-is to production without finishing integration and a Firebase Emulator test.** The functions are a secure server-side foundation, not a fully verified rollout.

1. Use Firebase Auth for **admin financial approval only**. Driver login (phone + dashboard-issued code) stays unchanged. Admin UID allowlist is set in the Cloud Functions environment variable `WALLET_ADMIN_UIDS`; never put it in Vite client config. Enable App Check and Firebase Functions for the project.
2. The `reviewWalletTopUp` callable approves/rejects only once and credits cents atomically with an immutable ledger record. The dashboard must invoke it after admin authentication; no browser-side wallet writes.
3. Driver currently submits pending requests directly via RTDB and reads them directly. **Do not allow broad anonymous reads/writes**. A driver-facing authenticated backend endpoint or server-verified session is required before deployment, while preserving the same visible login flow.
4. The trigger `debitCompletedDelivery` charges 1/3 of delivery fee once when order status is completed/delivered. It currently assumes cash-on-delivery. Handle prepaid orders and historical settlements before deployment. A failed debit creates a reconciliation exception.
5. **Critical**: legacy driver order acceptance and completion write directly to RTDB; enforce wallet eligibility and order assignment with trusted server-side operations or strict scoped RTDB rules. Otherwise a driver can bypass wallet restrictions.
6. The sample `firebase.wallet.rules.json` is an illustrative rules fragment, **not** a full replacement for existing production rules. Merge carefully; test with Emulator and keep all wallet balance/ledger writes server-only.
7. Use integer cents; reconcile existing `driverSettlements` against ledger before switching accounting. Verify duplicates, parallel approvals, cancellation, insufficient balance, and crash/retry cases.
8. The root-level RTDB transactions are correct for atomicity but can become expensive/contentious at scale; migrate to a narrow wallet/ledger transaction design before large-scale rollout.

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onValueWritten} = require("firebase-functions/v2/database");
const {getDatabase} = require("firebase-admin/database");
const {initializeApp} = require("firebase-admin/app");
initializeApp();

const REGION = "us-central1";
const db = getDatabase();
const money = v => Number.isSafeInteger(v) && v >= 0 ? v : null;
const admins = () => (process.env.WALLET_ADMIN_UIDS || "").split(",").map(x => x.trim()).filter(Boolean);
function assertAdmin(req) {
  if (!req.auth || !admins().includes(req.auth.uid))
    throw new HttpsError("permission-denied", "Not authorized to manage wallets.");
}
const ensure = x => x && typeof x === "object" && !Array.isArray(x);
const keyOK = x => typeof x === "string" && /^[A-Za-z0-9_-]{5,100}$/.test(x);

exports.reviewWalletTopUp = onCall({region:REGION, enforceAppCheck:true}, async req => {
  assertAdmin(req);
  const {requestId, decision, note} = req.data || {};
  if (!keyOK(requestId) || !["approved","rejected"].includes(decision))
    throw new HttpsError("invalid-argument", "Invalid request or decision.");
  if (typeof note !== "undefined" && (typeof note !== "string" || note.length > 300))
    throw new HttpsError("invalid-argument", "Invalid note.");
  const root = db.ref("/");
  let reason = "not-found";
  const result = await root.transaction(data => {
    if (!ensure(data)) return;
    const requests = data.walletTopUpRequests || {};
    const item = requests[requestId];
    if (!ensure(item)) return;
    if (item.status !== "pending") {reason="already-reviewed";return;}
    if (!keyOK(item.driverId)) {reason="invalid-driver";return;}
    const cents = money(item.amountCents);
    if (cents === null || cents < 10000 || cents > 1000000) {reason="invalid-amount";return;}
    const driver = data.drivers?.[item.driverId];
    if (!ensure(driver)) {reason="driver-not-found";return;}
    data.driverWallets ||= {};
    const wallet = data.driverWallets[item.driverId] ||= {balanceCents:0,activated:false};
    const balance = money(wallet.balanceCents);
    if (balance === null) {reason="invalid-balance";return;}
    const next = balance + (decision === "approved" ? cents : 0);
    if (!Number.isSafeInteger(next)) {reason="balance-overflow";return;}
    if (decision === "approved") {
      wallet.balanceCents = next;
      wallet.activated = true;
      wallet.updatedAt = Date.now();
      data.driverWalletLedger ||= {};
      data.driverWalletLedger[item.driverId] ||= {};
      data.driverWalletLedger[item.driverId]["topup_"+requestId] = {
        type:"topup", amountCents:cents, balanceAfterCents:next,
        requestId, createdAt:Date.now(), approvedBy:req.auth.uid
      };
    }
    item.status = decision;
    item.reviewedAt = Date.now();
    item.reviewedBy = req.auth.uid;
    item.reviewNote = (note || "").trim();
    return data;
  }, undefined, false);
  if (!result.committed)
    throw new HttpsError("failed-precondition", reason);
  return {status:decision,requestId};
});

// Processes completed orders only once, including retries. Never deducts for cancellations.
// Existing COD settlement accounting must be reconciled before enabling this trigger in production.
exports.debitCompletedDelivery = onValueWritten(
  {ref:"/orders/{orderId}/status",region:REGION,instance:"nezamak-41fe2-default-rtdb"},
  async event => {
    const status = String(event.data.after.val() || "").toLowerCase();
    if (!["completed","delivered"].includes(status)) return;
    const orderId = event.params.orderId;
    const root = db.ref("/");
    await root.transaction(data => {
      if (!ensure(data)) return;
      const order = data.orders?.[orderId];
      if (!ensure(order) || !["completed","delivered"].includes(String(order.status||"").toLowerCase())) return;
      const driverId = String(order.driverId || "");
      if (!keyOK(driverId)) return;
      const fee = Number(order.deliveryFee);
      if (!Number.isFinite(fee) || fee <= 0 || fee > 10000) return;
      const cents = Math.round(fee*100/3);
      data.driverWallets ||= {};
      const wallet = data.driverWallets[driverId];
      if (!ensure(wallet) || wallet.activated !== true) return;
      const balance = money(wallet.balanceCents);
      if (balance === null) return;
      data.driverWalletLedger ||= {};
      data.driverWalletLedger[driverId] ||= {};
      const ledgerId = "commission_"+orderId;
      if (data.driverWalletLedger[driverId][ledgerId]) return;
      // Never allow a negative wallet. A missing charge must be visible for reconciliation.
      if (balance < cents) {
        data.walletChargeExceptions ||= {};
        data.walletChargeExceptions[orderId] = {driverId,amountCents:cents,reason:"insufficient_balance",createdAt:Date.now()};
        return data;
      }
      wallet.balanceCents = balance-cents;
      wallet.updatedAt = Date.now();
      data.driverWalletLedger[driverId][ledgerId] = {
        type:"commission",orderId,amountCents:-cents,
        balanceAfterCents:wallet.balanceCents,createdAt:Date.now()
      };
      return data;
    },undefined,false);
  }
);

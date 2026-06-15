/**
 * Paystack Nigeria fee calculation (frontend mirror of backend/src/utils/paystackFees.js)
 * Shows the buyer the total they pay so the organisation receives the exact ticket price.
 */
const RATE = 0.015, FLAT = 100, WAIVE_LT = 2500, CAP = 2000;

export const calculatePaystackFee = (amount) => {
  const applyFlat = amount >= WAIVE_LT;
  let fee = amount * RATE + (applyFlat ? FLAT : 0);
  if (fee > CAP) fee = CAP;
  return Math.ceil(fee);
};

export const grossUpForPaystack = (desired) => {
  desired = Number(desired) || 0;
  if (desired <= 0) return { subtotal: 0, fee: 0, total: 0 };
  const applyFlat = desired >= (WAIVE_LT - 100);
  let total = applyFlat ? (desired + FLAT) / (1 - RATE) : desired / (1 - RATE);
  total = Math.ceil(total);
  let fee = calculatePaystackFee(total);
  if (fee >= CAP) { total = desired + CAP; fee = CAP; }
  else { fee = total - desired; }
  return { subtotal: desired, fee, total };
};

export const fmtNaira = (n) => `₦${Number(n||0).toLocaleString('en-NG')}`;

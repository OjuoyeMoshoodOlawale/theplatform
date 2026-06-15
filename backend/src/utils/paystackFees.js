/**
 * paystackFees.js — Paystack Nigeria fee calculation
 *
 * Paystack local (NGN) charges:
 *   1.5% + NGN 100
 *   The NGN 100 flat fee is WAIVED for transactions under NGN 2,500
 *   Fees are CAPPED at NGN 2,000
 *
 * To receive an EXACT amount, we "gross up" — the buyer pays the amount
 * plus the fee, so after Paystack deducts its cut we get exactly what we wanted.
 *
 * Reference: https://paystack.com/pricing
 */

const RATE      = 0.015;   // 1.5%
const FLAT      = 100;     // NGN 100 flat fee
const WAIVE_LT  = 2500;    // flat fee waived below this amount
const CAP       = 2000;    // fee capped at NGN 2000

/**
 * Calculate the fee Paystack would charge on a given settlement amount.
 * @param {number} amount - the amount you want to RECEIVE (settlement)
 * @returns {number} fee in naira (rounded up to nearest naira)
 */
export const calculatePaystackFee = (amount) => {
  const applyFlat = amount >= WAIVE_LT;
  let fee = amount * RATE + (applyFlat ? FLAT : 0);
  if (fee > CAP) fee = CAP;
  return Math.ceil(fee);
};

/**
 * Gross up: given the amount you want to RECEIVE, return the total the
 * buyer must PAY so that after Paystack's cut you get the exact amount.
 *
 * Paystack documents this formula. We solve for the total T such that:
 *   T - fee(T) = desired
 *
 * @param {number} desired - the exact amount you want to receive (naira)
 * @returns {{ subtotal:number, fee:number, total:number }}
 */
export const grossUpForPaystack = (desired) => {
  desired = Number(desired) || 0;
  if (desired <= 0) return { subtotal: 0, fee: 0, total: 0 };

  const applyFlat = desired >= (WAIVE_LT - 100); // approximate boundary

  // Paystack's documented gross-up formula:
  //   total = (desired + flat) / (1 - rate)
  let total;
  if (applyFlat) {
    total = (desired + FLAT) / (1 - RATE);
  } else {
    total = desired / (1 - RATE);
  }
  total = Math.ceil(total);

  // Verify the fee on the grossed-up total doesn't exceed cap
  let fee = calculatePaystackFee(total);
  // If capped, recompute total = desired + cap
  if (fee >= CAP) {
    total = desired + CAP;
    fee   = CAP;
  } else {
    fee = total - desired;
  }

  return {
    subtotal: desired,      // what the org receives
    fee,                    // Paystack's cut, paid by buyer
    total,                  // what the buyer pays
  };
};

/**
 * Format the breakdown for display
 */
export const feeBreakdown = (desired) => {
  const { subtotal, fee, total } = grossUpForPaystack(desired);
  return {
    subtotal,
    fee,
    total,
    subtotalText: `NGN ${subtotal.toLocaleString('en-NG')}`,
    feeText:      `NGN ${fee.toLocaleString('en-NG')}`,
    totalText:    `NGN ${total.toLocaleString('en-NG')}`,
  };
};

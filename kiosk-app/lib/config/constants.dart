/// Base URL of the deployed Next.js backend, shared by every kiosk regardless
/// of cafe. Override at build time with:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.20:3003
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://scan-and-pay-sable.vercel.app',
);

/// Ceiling on any single API call. Without one, a kiosk on flaky cafe wifi can
/// sit on a spinner indefinitely — the socket never errors, so the screen never
/// recovers and the customer is stranded mid-order until the idle reset fires.
const Duration kApiTimeout = Duration(seconds: 15);

const Duration kMenuRefreshInterval = Duration(seconds: 60);

const Duration kPostPaymentPollInterval = Duration(seconds: 2);
/// Kept deliberately patient (~3 min at the 2s interval): a payment made on a
/// flaky office network can take well over the old 30s for the webhook/UPI to
/// settle, and declaring FAILED while the money is in flight is the worst
/// outcome on a kiosk. A network error mid-poll is retried, never failed. Runs
/// a little past the server's pending-expiry window so a genuinely failed or
/// cancelled payment is observed as FAILED here rather than timing out blindly.
const int kPostPaymentMaxAttempts = 90;
const Duration kTransientErrorExtraDelay = Duration(seconds: 3);

/// Native-QR payment screen: how often the kiosk asks the server to reconcile
/// the QR against Razorpay while the customer scans and pays. 4s stays well
/// under the /reconcile route's 30-req/min per-IP rate limit (~15/min).
const Duration kQrPollInterval = Duration(seconds: 4);

/// How long the QR stays on screen awaiting payment before the kiosk gives up
/// and resets for the next customer. Patient on purpose — a slow scan or a
/// webhook/UPI lag must not read as a failure. Stays under the server's QR
/// close_by (RAZORPAY_QR_CLOSE_MINUTES, default 15m) but longer than a normal
/// scan-and-pay.
const Duration kQrPaymentTimeout = Duration(minutes: 3);

/// How long the post-payment receipt stays on screen before the kiosk
/// resets to the menu for the next customer. Kept short on purpose - unlike
/// a customer's own phone, a shared kiosk can't sit on one order's live
/// status for the minutes it takes to prepare food.
const Duration kReceiptAutoReset = Duration(seconds: 10);

/// How long the feedback screen shows its "thanks" state before resetting
/// to the menu, once the customer has submitted a star rating.
const Duration kFeedbackAutoReset = Duration(seconds: 10);

const Duration kPaymentFailureCountdown = Duration(seconds: 5);

/// How long the kiosk waits with no touch activity before abandoning
/// whatever's in progress (cart contents, a half-filled checkout form) and
/// resetting to the menu. Protects the next customer from seeing the
/// previous customer's name/phone/email left on screen.
const Duration kIdleResetTimeout = Duration(seconds: 60);

const String kCafeSlugPrefKey = 'kiosk_cafe_slug';
const String kCafeNamePrefKey = 'kiosk_cafe_name';

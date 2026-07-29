/// Base URL of the deployed Next.js backend, shared by every kiosk regardless
/// of cafe. Override at build time with:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.20:3003
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://scan-and-pay-nine.vercel.app',
);

const Duration kMenuRefreshInterval = Duration(seconds: 60);

const Duration kPostPaymentPollInterval = Duration(seconds: 2);
const int kPostPaymentMaxAttempts = 15;
const Duration kTransientErrorExtraDelay = Duration(seconds: 3);

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

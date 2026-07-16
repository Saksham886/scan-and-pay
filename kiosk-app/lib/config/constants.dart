/// Base URL of the deployed Next.js backend, shared by every kiosk regardless
/// of cafe. Override at build time with:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.20:3003
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3003',
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

const Duration kPaymentFailureCountdown = Duration(seconds: 5);

const String kCafeSlugPrefKey = 'kiosk_cafe_slug';
const String kCafeNamePrefKey = 'kiosk_cafe_name';

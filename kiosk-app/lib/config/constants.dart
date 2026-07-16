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

const Duration kOrderStatusPollInterval = Duration(seconds: 5);
const Duration kOrderStatusAutoReset = Duration(seconds: 18);

const Duration kPaymentFailureCountdown = Duration(seconds: 5);

const String kCafeSlugPrefKey = 'kiosk_cafe_slug';
const String kCafeNamePrefKey = 'kiosk_cafe_name';

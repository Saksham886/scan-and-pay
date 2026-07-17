class ValidationResult {
  final bool valid;
  final String? error;

  const ValidationResult({required this.valid, this.error});

  static const ValidationResult ok = ValidationResult(valid: true);
}

final RegExp _namePattern = RegExp(r"^[A-Za-z][A-Za-z\s.'-]*[A-Za-z.]$");
final RegExp _emailPattern = RegExp(
  r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$",
);
final RegExp _repeatedCharPattern = RegExp(r'(.)\1{4,}');
final RegExp _allSameDigitPattern = RegExp(r'^(\d)\1{9}$');
final RegExp _startsWithSixToNine = RegExp(r'^[6-9]');
final RegExp _nonDigits = RegExp(r'\D');

ValidationResult validateName(String raw) {
  final name = raw.trim();
  if (name.isEmpty) {
    return const ValidationResult(valid: false, error: 'Name is required');
  }
  if (name.length < 2) {
    return const ValidationResult(
      valid: false,
      error: 'Name must be at least 2 characters',
    );
  }
  if (name.length > 60) {
    return const ValidationResult(
      valid: false,
      error: 'Name must be 60 characters or less',
    );
  }
  if (!_namePattern.hasMatch(name)) {
    return const ValidationResult(
      valid: false,
      error: 'Name can only contain letters, spaces, hyphens and apostrophes',
    );
  }
  if (_repeatedCharPattern.hasMatch(name)) {
    return const ValidationResult(valid: false, error: 'Please enter a valid name');
  }
  return ValidationResult.ok;
}

String normalizePhone(String raw) {
  final digits = raw.replaceAll(_nonDigits, '');
  return digits.length <= 10 ? digits : digits.substring(digits.length - 10);
}

ValidationResult validatePhone(String raw) {
  final digits = raw.replaceAll(_nonDigits, '');
  if (digits.isEmpty) {
    return const ValidationResult(valid: false, error: 'Phone number is required');
  }
  if (digits.length != 10) {
    return const ValidationResult(
      valid: false,
      error: 'Phone number must be exactly 10 digits',
    );
  }
  if (!_startsWithSixToNine.hasMatch(digits)) {
    return const ValidationResult(
      valid: false,
      error: 'Enter a valid Indian mobile number (starts with 6-9)',
    );
  }
  if (_allSameDigitPattern.hasMatch(digits)) {
    return const ValidationResult(valid: false, error: 'Please enter a valid phone number');
  }
  return ValidationResult.ok;
}

ValidationResult validateEmail(String raw) {
  final email = raw.trim().toLowerCase();
  if (email.isEmpty) {
    return ValidationResult.ok;
  }
  if (email.length > 254) {
    return const ValidationResult(valid: false, error: 'Email is too long');
  }
  if (email.contains('..')) {
    return const ValidationResult(valid: false, error: 'Please enter a valid email');
  }
  if (!_emailPattern.hasMatch(email)) {
    return const ValidationResult(
      valid: false,
      error: 'Please enter a valid email address',
    );
  }
  final parts = email.split('@');
  final local = parts[0];
  final domain = parts[1];
  if (local.length > 64) {
    return const ValidationResult(valid: false, error: 'Email is not valid');
  }
  if (!domain.contains('.')) {
    return const ValidationResult(valid: false, error: 'Email domain is not valid');
  }
  return ValidationResult.ok;
}

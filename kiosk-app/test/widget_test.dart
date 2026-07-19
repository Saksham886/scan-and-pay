import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:kiosk_app/main.dart';

void main() {
  testWidgets('App boots to the setup screen when no cafe is configured',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const KioskApp());
    await tester.pumpAndSettle();

    expect(find.text('Kiosk Setup'), findsOneWidget);
  });
}

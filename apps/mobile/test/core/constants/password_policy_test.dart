import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/constants/app_constants.dart';

void main() {
  group('AppConstants.newPasswordError', () {
    const cases = {
      'short1!': 'Password must be at least 10 characters',
      'alllowercase1!': 'Password must contain an uppercase letter',
      'ALLUPPERCASE1!': 'Password must contain a lowercase letter',
      'NoDigits!!!!': 'Password must contain a number',
      'NoSymbol1234': r'Password must contain a special character (!@#$%^&*)',
    };

    cases.forEach((password, message) {
      test('rejects $password naming the missing rule', () {
        expect(AppConstants.newPasswordError(password), message);
      });
    });

    test('rejects a password over 72 characters', () {
      expect(
        AppConstants.newPasswordError('Aa1!${'a' * 69}'),
        'Password must be at most 72 characters',
      );
    });

    test('asks for a password when empty', () {
      expect(AppConstants.newPasswordError(''), 'Enter a password');
    });

    test('accepts a password that meets every rule', () {
      expect(AppConstants.newPasswordError('Strong@1234'), isNull);
    });
  });
}

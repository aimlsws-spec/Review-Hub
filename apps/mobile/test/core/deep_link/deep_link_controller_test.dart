import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/deep_link/deep_link_controller.dart';

void main() {
  group('referralCodeFromLink', () {
    test('reads the code from a referral link', () {
      expect(referralCodeFromLink(Uri.parse('viralkar://referral?code=ABC123')), 'ABC123');
    });

    test('ignores a link for a different host', () {
      expect(referralCodeFromLink(Uri.parse('viralkar://campaign?id=1')), isNull);
    });

    test('ignores a referral link with no code', () {
      expect(referralCodeFromLink(Uri.parse('viralkar://referral')), isNull);
    });

    test('ignores a referral link with an empty code', () {
      expect(referralCodeFromLink(Uri.parse('viralkar://referral?code=')), isNull);
    });
  });
}

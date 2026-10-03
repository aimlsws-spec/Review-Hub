import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/features/auth/data/models/login_challenge_model.dart';

void main() {
  Map<String, dynamic> challengeJson([Map<String, dynamic> extra = const {}]) => {
    'requiresVerification': true,
    'challengeToken': 'token',
    'expiresIn': 300,
    'sentTo': ['j****n@example.com'],
    ...extra,
  };

  LoginChallengeModel parse(Map<String, dynamic> json) =>
      (LoginOutcome.fromJson(json) as LoginNeedsDeviceCode).challenge;

  test('reads a two-factor challenge', () {
    expect(parse(challengeJson({'reason': 'TWO_FACTOR'})).reason, LoginChallengeReason.twoFactor);
  });

  test('reads a new-device challenge', () {
    expect(parse(challengeJson({'reason': 'NEW_DEVICE'})).reason, LoginChallengeReason.newDevice);
  });

  test('treats a challenge from an older server, or an unknown reason, as a new device', () {
    expect(parse(challengeJson()).reason, LoginChallengeReason.newDevice);
    expect(parse(challengeJson({'reason': 'SOMETHING_ELSE'})).reason, LoginChallengeReason.newDevice);
  });
}

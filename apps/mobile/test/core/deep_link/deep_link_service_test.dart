import 'dart:async';

import 'package:app_links_platform_interface/app_links_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/deep_link/deep_link_service.dart';

class _FakeAppLinksPlatform extends AppLinksPlatform {
  _FakeAppLinksPlatform({this.initialLink, Stream<Uri>? linkStream})
      : _linkStream = linkStream ?? const Stream.empty();

  final Uri? initialLink;
  final Stream<Uri> _linkStream;

  @override
  Future<Uri?> getInitialLink() async => initialLink;

  @override
  Stream<Uri> get uriLinkStream => _linkStream;
}

void main() {
  group('DeepLinkService', () {
    test('returns the initial link that launched the app', () async {
      AppLinksPlatform.instance = _FakeAppLinksPlatform(initialLink: Uri.parse('viralkar://referral?code=X'));

      final link = await DeepLinkService().getInitialLink();

      expect(link, Uri.parse('viralkar://referral?code=X'));
    });

    test('returns null when nothing launched the app', () async {
      AppLinksPlatform.instance = _FakeAppLinksPlatform();

      final link = await DeepLinkService().getInitialLink();

      expect(link, isNull);
    });

    test('never throws when the platform side fails', () async {
      AppLinksPlatform.instance = _ThrowingAppLinksPlatform();

      final link = await DeepLinkService().getInitialLink();

      expect(link, isNull);
    });

    test('forwards links received while the app is running', () async {
      final controller = StreamController<Uri>();
      AppLinksPlatform.instance = _FakeAppLinksPlatform(linkStream: controller.stream);

      final received = <Uri>[];
      final subscription = DeepLinkService().onLink.listen(received.add);
      controller.add(Uri.parse('viralkar://referral?code=Y'));
      await Future<void>.delayed(Duration.zero);

      expect(received, [Uri.parse('viralkar://referral?code=Y')]);
      await subscription.cancel();
      await controller.close();
    });
  });
}

class _ThrowingAppLinksPlatform extends AppLinksPlatform {
  @override
  Future<Uri?> getInitialLink() => throw Exception('boom');
}

import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geolocator_platform_interface/geolocator_platform_interface.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/location/location_service.dart';

class _FakeGeolocatorPlatform extends GeolocatorPlatform {
  _FakeGeolocatorPlatform({
    this.serviceEnabled = true,
    this.permission = LocationPermission.whileInUse,
    this.requestedPermission,
    this.position,
    this.throwOnPosition,
  });

  final bool serviceEnabled;
  LocationPermission permission;
  final LocationPermission? requestedPermission;
  final Position? position;
  final Object? throwOnPosition;

  @override
  Future<bool> isLocationServiceEnabled() async => serviceEnabled;

  @override
  Future<LocationPermission> checkPermission() async => permission;

  @override
  Future<LocationPermission> requestPermission() async {
    if (requestedPermission != null) permission = requestedPermission!;
    return permission;
  }

  @override
  Future<Position> getCurrentPosition({LocationSettings? locationSettings}) async {
    if (throwOnPosition != null) throw throwOnPosition!;
    return position!;
  }
}

Position _fakePosition({double latitude = 12.9716, double longitude = 77.5946}) {
  return Position(
    latitude: latitude,
    longitude: longitude,
    timestamp: DateTime(2026),
    accuracy: 5,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    headingAccuracy: 0,
    speed: 0,
    speedAccuracy: 0,
  );
}

void main() {
  group('GeolocatorLocationService', () {
    test('fails when location services are off, without asking for permission', () async {
      GeolocatorPlatform.instance = _FakeGeolocatorPlatform(serviceEnabled: false);

      final result = await GeolocatorLocationService().getCurrentLocation();

      expect(result.failureOrNull, isA<LocationServiceDisabledFailure>());
    });

    test('requests permission when not yet decided, and proceeds once granted', () async {
      GeolocatorPlatform.instance = _FakeGeolocatorPlatform(
        permission: LocationPermission.denied,
        requestedPermission: LocationPermission.whileInUse,
        position: _fakePosition(),
      );

      final result = await GeolocatorLocationService().getCurrentLocation();

      expect(result.isSuccess, isTrue);
      expect(result.valueOrNull?.latitude, 12.9716);
      expect(result.valueOrNull?.longitude, 77.5946);
    });

    test('fails when permission is refused', () async {
      GeolocatorPlatform.instance = _FakeGeolocatorPlatform(
        permission: LocationPermission.denied,
        requestedPermission: LocationPermission.denied,
      );

      final result = await GeolocatorLocationService().getCurrentLocation();

      expect(result.failureOrNull, isA<LocationPermissionDeniedFailure>());
    });

    test('fails when permission is permanently denied, without asking again', () async {
      GeolocatorPlatform.instance = _FakeGeolocatorPlatform(permission: LocationPermission.deniedForever);

      final result = await GeolocatorLocationService().getCurrentLocation();

      expect(result.failureOrNull, isA<LocationPermissionDeniedFailure>());
    });

    test('returns the position when already granted', () async {
      GeolocatorPlatform.instance = _FakeGeolocatorPlatform(
        permission: LocationPermission.always,
        position: _fakePosition(latitude: 1, longitude: 2),
      );

      final result = await GeolocatorLocationService().getCurrentLocation();

      expect(result.valueOrNull?.latitude, 1);
      expect(result.valueOrNull?.longitude, 2);
    });

    test('turns a plugin error into an UnknownFailure instead of throwing', () async {
      GeolocatorPlatform.instance = _FakeGeolocatorPlatform(
        permission: LocationPermission.whileInUse,
        throwOnPosition: Exception('boom'),
      );

      final result = await GeolocatorLocationService().getCurrentLocation();

      expect(result.failureOrNull, isA<UnknownFailure>());
    });
  });
}

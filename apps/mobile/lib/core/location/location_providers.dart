import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../errors/result.dart';
import 'location_coordinates.dart';
import 'location_service.dart';

final locationServiceProvider = Provider<LocationService>((ref) => GeolocatorLocationService());

/// The device's current position, read fresh every time this is watched.
/// `autoDispose` so a screen that's left the stack never hands out a stale fix.
final currentLocationProvider = FutureProvider.autoDispose<Result<LocationCoordinates>>((ref) {
  return ref.watch(locationServiceProvider).getCurrentLocation();
});

import 'package:geolocator/geolocator.dart';

import '../errors/failure.dart';
import '../errors/result.dart';
import 'location_coordinates.dart';

/// Reads the device's current GPS position, asking for permission first if needed.
abstract class LocationService {
  Future<Result<LocationCoordinates>> getCurrentLocation();
}

/// The real implementation, over the `geolocator` plugin.
class GeolocatorLocationService implements LocationService {
  @override
  Future<Result<LocationCoordinates>> getCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return const Result.failure(LocationServiceDisabledFailure());

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      return const Result.failure(LocationPermissionDeniedFailure());
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      );
      return Result.success(LocationCoordinates(latitude: position.latitude, longitude: position.longitude));
    } catch (_) {
      return const Result.failure(UnknownFailure());
    }
  }
}

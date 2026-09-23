/// A single point read from the device's GPS — kept minimal on purpose,
/// just enough to send to the backend for nearest-sort and location check-in.
class LocationCoordinates {
  const LocationCoordinates({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

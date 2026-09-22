import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/result.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/location_repository.dart';
import '../data/models/location_models.dart';

final locationRepositoryProvider = Provider<LocationRepository>((ref) {
  return LocationRepository(ref.watch(dioProvider));
});

/// Loaded when the edit-profile screen opens and dropped when it closes, like the other page-scoped providers.
final statesProvider = FutureProvider.autoDispose<Result<List<StateModel>>>((ref) async {
  return ref.watch(locationRepositoryProvider).listStates();
});

/// The cities of one state. Only asked for once a state is chosen.
final citiesProvider = FutureProvider.autoDispose.family<Result<List<CityModel>>, String>((ref, stateId) async {
  return ref.watch(locationRepositoryProvider).listCities(stateId);
});

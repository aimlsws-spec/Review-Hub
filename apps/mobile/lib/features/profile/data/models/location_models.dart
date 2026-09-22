import 'package:freezed_annotation/freezed_annotation.dart';

part 'location_models.freezed.dart';
part 'location_models.g.dart';

/// A state or union territory, as returned by `GET /locations/states`.
@freezed
abstract class StateModel with _$StateModel {
  const factory StateModel({
    required String id,
    @Default('') String name,
    String? code,
  }) = _StateModel;

  factory StateModel.fromJson(Map<String, dynamic> json) => _$StateModelFromJson(json);
}

/// A city, as returned by `GET /locations/states/:stateId/cities`.
@freezed
abstract class CityModel with _$CityModel {
  const factory CityModel({
    required String id,
    @Default('') String name,
  }) = _CityModel;

  factory CityModel.fromJson(Map<String, dynamic> json) => _$CityModelFromJson(json);
}

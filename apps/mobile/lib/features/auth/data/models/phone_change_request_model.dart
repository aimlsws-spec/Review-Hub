import 'package:freezed_annotation/freezed_annotation.dart';

part 'phone_change_request_model.freezed.dart';
part 'phone_change_request_model.g.dart';

/// What `/auth/phone/change` returns once the code is on its way to the new number.
@freezed
abstract class PhoneChangeRequestModel with _$PhoneChangeRequestModel {
  const factory PhoneChangeRequestModel({
    required int expiresIn,

    /// The new number, masked, e.g. `****3210`.
    required String sentTo,
  }) = _PhoneChangeRequestModel;

  factory PhoneChangeRequestModel.fromJson(Map<String, dynamic> json) => _$PhoneChangeRequestModelFromJson(json);
}

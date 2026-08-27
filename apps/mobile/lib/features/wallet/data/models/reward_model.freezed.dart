// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'reward_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RewardModel {

 String get id; String get campaignId; String get submissionId; String get rewardType; String get amount; String get status; DateTime? get approvedAt; DateTime? get creditedAt; String? get failedReason; DateTime get createdAt;
/// Create a copy of RewardModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RewardModelCopyWith<RewardModel> get copyWith => _$RewardModelCopyWithImpl<RewardModel>(this as RewardModel, _$identity);

  /// Serializes this RewardModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RewardModel&&(identical(other.id, id) || other.id == id)&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.submissionId, submissionId) || other.submissionId == submissionId)&&(identical(other.rewardType, rewardType) || other.rewardType == rewardType)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.status, status) || other.status == status)&&(identical(other.approvedAt, approvedAt) || other.approvedAt == approvedAt)&&(identical(other.creditedAt, creditedAt) || other.creditedAt == creditedAt)&&(identical(other.failedReason, failedReason) || other.failedReason == failedReason)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,campaignId,submissionId,rewardType,amount,status,approvedAt,creditedAt,failedReason,createdAt);

@override
String toString() {
  return 'RewardModel(id: $id, campaignId: $campaignId, submissionId: $submissionId, rewardType: $rewardType, amount: $amount, status: $status, approvedAt: $approvedAt, creditedAt: $creditedAt, failedReason: $failedReason, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $RewardModelCopyWith<$Res>  {
  factory $RewardModelCopyWith(RewardModel value, $Res Function(RewardModel) _then) = _$RewardModelCopyWithImpl;
@useResult
$Res call({
 String id, String campaignId, String submissionId, String rewardType, String amount, String status, DateTime? approvedAt, DateTime? creditedAt, String? failedReason, DateTime createdAt
});




}
/// @nodoc
class _$RewardModelCopyWithImpl<$Res>
    implements $RewardModelCopyWith<$Res> {
  _$RewardModelCopyWithImpl(this._self, this._then);

  final RewardModel _self;
  final $Res Function(RewardModel) _then;

/// Create a copy of RewardModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? campaignId = null,Object? submissionId = null,Object? rewardType = null,Object? amount = null,Object? status = null,Object? approvedAt = freezed,Object? creditedAt = freezed,Object? failedReason = freezed,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,submissionId: null == submissionId ? _self.submissionId : submissionId // ignore: cast_nullable_to_non_nullable
as String,rewardType: null == rewardType ? _self.rewardType : rewardType // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,approvedAt: freezed == approvedAt ? _self.approvedAt : approvedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,creditedAt: freezed == creditedAt ? _self.creditedAt : creditedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,failedReason: freezed == failedReason ? _self.failedReason : failedReason // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [RewardModel].
extension RewardModelPatterns on RewardModel {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RewardModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RewardModel() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RewardModel value)  $default,){
final _that = this;
switch (_that) {
case _RewardModel():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RewardModel value)?  $default,){
final _that = this;
switch (_that) {
case _RewardModel() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String campaignId,  String submissionId,  String rewardType,  String amount,  String status,  DateTime? approvedAt,  DateTime? creditedAt,  String? failedReason,  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RewardModel() when $default != null:
return $default(_that.id,_that.campaignId,_that.submissionId,_that.rewardType,_that.amount,_that.status,_that.approvedAt,_that.creditedAt,_that.failedReason,_that.createdAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String campaignId,  String submissionId,  String rewardType,  String amount,  String status,  DateTime? approvedAt,  DateTime? creditedAt,  String? failedReason,  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _RewardModel():
return $default(_that.id,_that.campaignId,_that.submissionId,_that.rewardType,_that.amount,_that.status,_that.approvedAt,_that.creditedAt,_that.failedReason,_that.createdAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String campaignId,  String submissionId,  String rewardType,  String amount,  String status,  DateTime? approvedAt,  DateTime? creditedAt,  String? failedReason,  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _RewardModel() when $default != null:
return $default(_that.id,_that.campaignId,_that.submissionId,_that.rewardType,_that.amount,_that.status,_that.approvedAt,_that.creditedAt,_that.failedReason,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RewardModel implements RewardModel {
  const _RewardModel({required this.id, required this.campaignId, required this.submissionId, required this.rewardType, required this.amount, required this.status, this.approvedAt, this.creditedAt, this.failedReason, required this.createdAt});
  factory _RewardModel.fromJson(Map<String, dynamic> json) => _$RewardModelFromJson(json);

@override final  String id;
@override final  String campaignId;
@override final  String submissionId;
@override final  String rewardType;
@override final  String amount;
@override final  String status;
@override final  DateTime? approvedAt;
@override final  DateTime? creditedAt;
@override final  String? failedReason;
@override final  DateTime createdAt;

/// Create a copy of RewardModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RewardModelCopyWith<_RewardModel> get copyWith => __$RewardModelCopyWithImpl<_RewardModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RewardModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RewardModel&&(identical(other.id, id) || other.id == id)&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.submissionId, submissionId) || other.submissionId == submissionId)&&(identical(other.rewardType, rewardType) || other.rewardType == rewardType)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.status, status) || other.status == status)&&(identical(other.approvedAt, approvedAt) || other.approvedAt == approvedAt)&&(identical(other.creditedAt, creditedAt) || other.creditedAt == creditedAt)&&(identical(other.failedReason, failedReason) || other.failedReason == failedReason)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,campaignId,submissionId,rewardType,amount,status,approvedAt,creditedAt,failedReason,createdAt);

@override
String toString() {
  return 'RewardModel(id: $id, campaignId: $campaignId, submissionId: $submissionId, rewardType: $rewardType, amount: $amount, status: $status, approvedAt: $approvedAt, creditedAt: $creditedAt, failedReason: $failedReason, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$RewardModelCopyWith<$Res> implements $RewardModelCopyWith<$Res> {
  factory _$RewardModelCopyWith(_RewardModel value, $Res Function(_RewardModel) _then) = __$RewardModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String campaignId, String submissionId, String rewardType, String amount, String status, DateTime? approvedAt, DateTime? creditedAt, String? failedReason, DateTime createdAt
});




}
/// @nodoc
class __$RewardModelCopyWithImpl<$Res>
    implements _$RewardModelCopyWith<$Res> {
  __$RewardModelCopyWithImpl(this._self, this._then);

  final _RewardModel _self;
  final $Res Function(_RewardModel) _then;

/// Create a copy of RewardModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? campaignId = null,Object? submissionId = null,Object? rewardType = null,Object? amount = null,Object? status = null,Object? approvedAt = freezed,Object? creditedAt = freezed,Object? failedReason = freezed,Object? createdAt = null,}) {
  return _then(_RewardModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,submissionId: null == submissionId ? _self.submissionId : submissionId // ignore: cast_nullable_to_non_nullable
as String,rewardType: null == rewardType ? _self.rewardType : rewardType // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,approvedAt: freezed == approvedAt ? _self.approvedAt : approvedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,creditedAt: freezed == creditedAt ? _self.creditedAt : creditedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,failedReason: freezed == failedReason ? _self.failedReason : failedReason // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on

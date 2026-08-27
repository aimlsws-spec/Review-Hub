// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'referral_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ReferredUserSummary {

 String get id; String get firstName; String get lastName; DateTime get createdAt;
/// Create a copy of ReferredUserSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReferredUserSummaryCopyWith<ReferredUserSummary> get copyWith => _$ReferredUserSummaryCopyWithImpl<ReferredUserSummary>(this as ReferredUserSummary, _$identity);

  /// Serializes this ReferredUserSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReferredUserSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,firstName,lastName,createdAt);

@override
String toString() {
  return 'ReferredUserSummary(id: $id, firstName: $firstName, lastName: $lastName, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $ReferredUserSummaryCopyWith<$Res>  {
  factory $ReferredUserSummaryCopyWith(ReferredUserSummary value, $Res Function(ReferredUserSummary) _then) = _$ReferredUserSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String firstName, String lastName, DateTime createdAt
});




}
/// @nodoc
class _$ReferredUserSummaryCopyWithImpl<$Res>
    implements $ReferredUserSummaryCopyWith<$Res> {
  _$ReferredUserSummaryCopyWithImpl(this._self, this._then);

  final ReferredUserSummary _self;
  final $Res Function(ReferredUserSummary) _then;

/// Create a copy of ReferredUserSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? firstName = null,Object? lastName = null,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [ReferredUserSummary].
extension ReferredUserSummaryPatterns on ReferredUserSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReferredUserSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReferredUserSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReferredUserSummary value)  $default,){
final _that = this;
switch (_that) {
case _ReferredUserSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReferredUserSummary value)?  $default,){
final _that = this;
switch (_that) {
case _ReferredUserSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String firstName,  String lastName,  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReferredUserSummary() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String firstName,  String lastName,  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _ReferredUserSummary():
return $default(_that.id,_that.firstName,_that.lastName,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String firstName,  String lastName,  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _ReferredUserSummary() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReferredUserSummary implements ReferredUserSummary {
  const _ReferredUserSummary({required this.id, required this.firstName, required this.lastName, required this.createdAt});
  factory _ReferredUserSummary.fromJson(Map<String, dynamic> json) => _$ReferredUserSummaryFromJson(json);

@override final  String id;
@override final  String firstName;
@override final  String lastName;
@override final  DateTime createdAt;

/// Create a copy of ReferredUserSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReferredUserSummaryCopyWith<_ReferredUserSummary> get copyWith => __$ReferredUserSummaryCopyWithImpl<_ReferredUserSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReferredUserSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReferredUserSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,firstName,lastName,createdAt);

@override
String toString() {
  return 'ReferredUserSummary(id: $id, firstName: $firstName, lastName: $lastName, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$ReferredUserSummaryCopyWith<$Res> implements $ReferredUserSummaryCopyWith<$Res> {
  factory _$ReferredUserSummaryCopyWith(_ReferredUserSummary value, $Res Function(_ReferredUserSummary) _then) = __$ReferredUserSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String firstName, String lastName, DateTime createdAt
});




}
/// @nodoc
class __$ReferredUserSummaryCopyWithImpl<$Res>
    implements _$ReferredUserSummaryCopyWith<$Res> {
  __$ReferredUserSummaryCopyWithImpl(this._self, this._then);

  final _ReferredUserSummary _self;
  final $Res Function(_ReferredUserSummary) _then;

/// Create a copy of ReferredUserSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? firstName = null,Object? lastName = null,Object? createdAt = null,}) {
  return _then(_ReferredUserSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}


/// @nodoc
mixin _$ReferralModel {

 String get id; String get referralCode; bool get rewardIssued; String? get rewardAmount; DateTime? get completedAt; DateTime get createdAt; ReferredUserSummary get referredUser;
/// Create a copy of ReferralModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReferralModelCopyWith<ReferralModel> get copyWith => _$ReferralModelCopyWithImpl<ReferralModel>(this as ReferralModel, _$identity);

  /// Serializes this ReferralModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReferralModel&&(identical(other.id, id) || other.id == id)&&(identical(other.referralCode, referralCode) || other.referralCode == referralCode)&&(identical(other.rewardIssued, rewardIssued) || other.rewardIssued == rewardIssued)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.referredUser, referredUser) || other.referredUser == referredUser));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,referralCode,rewardIssued,rewardAmount,completedAt,createdAt,referredUser);

@override
String toString() {
  return 'ReferralModel(id: $id, referralCode: $referralCode, rewardIssued: $rewardIssued, rewardAmount: $rewardAmount, completedAt: $completedAt, createdAt: $createdAt, referredUser: $referredUser)';
}


}

/// @nodoc
abstract mixin class $ReferralModelCopyWith<$Res>  {
  factory $ReferralModelCopyWith(ReferralModel value, $Res Function(ReferralModel) _then) = _$ReferralModelCopyWithImpl;
@useResult
$Res call({
 String id, String referralCode, bool rewardIssued, String? rewardAmount, DateTime? completedAt, DateTime createdAt, ReferredUserSummary referredUser
});


$ReferredUserSummaryCopyWith<$Res> get referredUser;

}
/// @nodoc
class _$ReferralModelCopyWithImpl<$Res>
    implements $ReferralModelCopyWith<$Res> {
  _$ReferralModelCopyWithImpl(this._self, this._then);

  final ReferralModel _self;
  final $Res Function(ReferralModel) _then;

/// Create a copy of ReferralModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? referralCode = null,Object? rewardIssued = null,Object? rewardAmount = freezed,Object? completedAt = freezed,Object? createdAt = null,Object? referredUser = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,referralCode: null == referralCode ? _self.referralCode : referralCode // ignore: cast_nullable_to_non_nullable
as String,rewardIssued: null == rewardIssued ? _self.rewardIssued : rewardIssued // ignore: cast_nullable_to_non_nullable
as bool,rewardAmount: freezed == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String?,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,referredUser: null == referredUser ? _self.referredUser : referredUser // ignore: cast_nullable_to_non_nullable
as ReferredUserSummary,
  ));
}
/// Create a copy of ReferralModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReferredUserSummaryCopyWith<$Res> get referredUser {
  
  return $ReferredUserSummaryCopyWith<$Res>(_self.referredUser, (value) {
    return _then(_self.copyWith(referredUser: value));
  });
}
}


/// Adds pattern-matching-related methods to [ReferralModel].
extension ReferralModelPatterns on ReferralModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReferralModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReferralModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReferralModel value)  $default,){
final _that = this;
switch (_that) {
case _ReferralModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReferralModel value)?  $default,){
final _that = this;
switch (_that) {
case _ReferralModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String referralCode,  bool rewardIssued,  String? rewardAmount,  DateTime? completedAt,  DateTime createdAt,  ReferredUserSummary referredUser)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReferralModel() when $default != null:
return $default(_that.id,_that.referralCode,_that.rewardIssued,_that.rewardAmount,_that.completedAt,_that.createdAt,_that.referredUser);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String referralCode,  bool rewardIssued,  String? rewardAmount,  DateTime? completedAt,  DateTime createdAt,  ReferredUserSummary referredUser)  $default,) {final _that = this;
switch (_that) {
case _ReferralModel():
return $default(_that.id,_that.referralCode,_that.rewardIssued,_that.rewardAmount,_that.completedAt,_that.createdAt,_that.referredUser);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String referralCode,  bool rewardIssued,  String? rewardAmount,  DateTime? completedAt,  DateTime createdAt,  ReferredUserSummary referredUser)?  $default,) {final _that = this;
switch (_that) {
case _ReferralModel() when $default != null:
return $default(_that.id,_that.referralCode,_that.rewardIssued,_that.rewardAmount,_that.completedAt,_that.createdAt,_that.referredUser);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReferralModel implements ReferralModel {
  const _ReferralModel({required this.id, required this.referralCode, this.rewardIssued = false, this.rewardAmount, this.completedAt, required this.createdAt, required this.referredUser});
  factory _ReferralModel.fromJson(Map<String, dynamic> json) => _$ReferralModelFromJson(json);

@override final  String id;
@override final  String referralCode;
@override@JsonKey() final  bool rewardIssued;
@override final  String? rewardAmount;
@override final  DateTime? completedAt;
@override final  DateTime createdAt;
@override final  ReferredUserSummary referredUser;

/// Create a copy of ReferralModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReferralModelCopyWith<_ReferralModel> get copyWith => __$ReferralModelCopyWithImpl<_ReferralModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReferralModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReferralModel&&(identical(other.id, id) || other.id == id)&&(identical(other.referralCode, referralCode) || other.referralCode == referralCode)&&(identical(other.rewardIssued, rewardIssued) || other.rewardIssued == rewardIssued)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.referredUser, referredUser) || other.referredUser == referredUser));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,referralCode,rewardIssued,rewardAmount,completedAt,createdAt,referredUser);

@override
String toString() {
  return 'ReferralModel(id: $id, referralCode: $referralCode, rewardIssued: $rewardIssued, rewardAmount: $rewardAmount, completedAt: $completedAt, createdAt: $createdAt, referredUser: $referredUser)';
}


}

/// @nodoc
abstract mixin class _$ReferralModelCopyWith<$Res> implements $ReferralModelCopyWith<$Res> {
  factory _$ReferralModelCopyWith(_ReferralModel value, $Res Function(_ReferralModel) _then) = __$ReferralModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String referralCode, bool rewardIssued, String? rewardAmount, DateTime? completedAt, DateTime createdAt, ReferredUserSummary referredUser
});


@override $ReferredUserSummaryCopyWith<$Res> get referredUser;

}
/// @nodoc
class __$ReferralModelCopyWithImpl<$Res>
    implements _$ReferralModelCopyWith<$Res> {
  __$ReferralModelCopyWithImpl(this._self, this._then);

  final _ReferralModel _self;
  final $Res Function(_ReferralModel) _then;

/// Create a copy of ReferralModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? referralCode = null,Object? rewardIssued = null,Object? rewardAmount = freezed,Object? completedAt = freezed,Object? createdAt = null,Object? referredUser = null,}) {
  return _then(_ReferralModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,referralCode: null == referralCode ? _self.referralCode : referralCode // ignore: cast_nullable_to_non_nullable
as String,rewardIssued: null == rewardIssued ? _self.rewardIssued : rewardIssued // ignore: cast_nullable_to_non_nullable
as bool,rewardAmount: freezed == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String?,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,referredUser: null == referredUser ? _self.referredUser : referredUser // ignore: cast_nullable_to_non_nullable
as ReferredUserSummary,
  ));
}

/// Create a copy of ReferralModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReferredUserSummaryCopyWith<$Res> get referredUser {
  
  return $ReferredUserSummaryCopyWith<$Res>(_self.referredUser, (value) {
    return _then(_self.copyWith(referredUser: value));
  });
}
}


/// @nodoc
mixin _$ReferralStatsModel {

 int get totalReferred; int get totalRewarded; double get totalRewardEarned;
/// Create a copy of ReferralStatsModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReferralStatsModelCopyWith<ReferralStatsModel> get copyWith => _$ReferralStatsModelCopyWithImpl<ReferralStatsModel>(this as ReferralStatsModel, _$identity);

  /// Serializes this ReferralStatsModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReferralStatsModel&&(identical(other.totalReferred, totalReferred) || other.totalReferred == totalReferred)&&(identical(other.totalRewarded, totalRewarded) || other.totalRewarded == totalRewarded)&&(identical(other.totalRewardEarned, totalRewardEarned) || other.totalRewardEarned == totalRewardEarned));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,totalReferred,totalRewarded,totalRewardEarned);

@override
String toString() {
  return 'ReferralStatsModel(totalReferred: $totalReferred, totalRewarded: $totalRewarded, totalRewardEarned: $totalRewardEarned)';
}


}

/// @nodoc
abstract mixin class $ReferralStatsModelCopyWith<$Res>  {
  factory $ReferralStatsModelCopyWith(ReferralStatsModel value, $Res Function(ReferralStatsModel) _then) = _$ReferralStatsModelCopyWithImpl;
@useResult
$Res call({
 int totalReferred, int totalRewarded, double totalRewardEarned
});




}
/// @nodoc
class _$ReferralStatsModelCopyWithImpl<$Res>
    implements $ReferralStatsModelCopyWith<$Res> {
  _$ReferralStatsModelCopyWithImpl(this._self, this._then);

  final ReferralStatsModel _self;
  final $Res Function(ReferralStatsModel) _then;

/// Create a copy of ReferralStatsModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? totalReferred = null,Object? totalRewarded = null,Object? totalRewardEarned = null,}) {
  return _then(_self.copyWith(
totalReferred: null == totalReferred ? _self.totalReferred : totalReferred // ignore: cast_nullable_to_non_nullable
as int,totalRewarded: null == totalRewarded ? _self.totalRewarded : totalRewarded // ignore: cast_nullable_to_non_nullable
as int,totalRewardEarned: null == totalRewardEarned ? _self.totalRewardEarned : totalRewardEarned // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [ReferralStatsModel].
extension ReferralStatsModelPatterns on ReferralStatsModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReferralStatsModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReferralStatsModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReferralStatsModel value)  $default,){
final _that = this;
switch (_that) {
case _ReferralStatsModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReferralStatsModel value)?  $default,){
final _that = this;
switch (_that) {
case _ReferralStatsModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int totalReferred,  int totalRewarded,  double totalRewardEarned)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReferralStatsModel() when $default != null:
return $default(_that.totalReferred,_that.totalRewarded,_that.totalRewardEarned);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int totalReferred,  int totalRewarded,  double totalRewardEarned)  $default,) {final _that = this;
switch (_that) {
case _ReferralStatsModel():
return $default(_that.totalReferred,_that.totalRewarded,_that.totalRewardEarned);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int totalReferred,  int totalRewarded,  double totalRewardEarned)?  $default,) {final _that = this;
switch (_that) {
case _ReferralStatsModel() when $default != null:
return $default(_that.totalReferred,_that.totalRewarded,_that.totalRewardEarned);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReferralStatsModel implements ReferralStatsModel {
  const _ReferralStatsModel({this.totalReferred = 0, this.totalRewarded = 0, this.totalRewardEarned = 0});
  factory _ReferralStatsModel.fromJson(Map<String, dynamic> json) => _$ReferralStatsModelFromJson(json);

@override@JsonKey() final  int totalReferred;
@override@JsonKey() final  int totalRewarded;
@override@JsonKey() final  double totalRewardEarned;

/// Create a copy of ReferralStatsModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReferralStatsModelCopyWith<_ReferralStatsModel> get copyWith => __$ReferralStatsModelCopyWithImpl<_ReferralStatsModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReferralStatsModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReferralStatsModel&&(identical(other.totalReferred, totalReferred) || other.totalReferred == totalReferred)&&(identical(other.totalRewarded, totalRewarded) || other.totalRewarded == totalRewarded)&&(identical(other.totalRewardEarned, totalRewardEarned) || other.totalRewardEarned == totalRewardEarned));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,totalReferred,totalRewarded,totalRewardEarned);

@override
String toString() {
  return 'ReferralStatsModel(totalReferred: $totalReferred, totalRewarded: $totalRewarded, totalRewardEarned: $totalRewardEarned)';
}


}

/// @nodoc
abstract mixin class _$ReferralStatsModelCopyWith<$Res> implements $ReferralStatsModelCopyWith<$Res> {
  factory _$ReferralStatsModelCopyWith(_ReferralStatsModel value, $Res Function(_ReferralStatsModel) _then) = __$ReferralStatsModelCopyWithImpl;
@override @useResult
$Res call({
 int totalReferred, int totalRewarded, double totalRewardEarned
});




}
/// @nodoc
class __$ReferralStatsModelCopyWithImpl<$Res>
    implements _$ReferralStatsModelCopyWith<$Res> {
  __$ReferralStatsModelCopyWithImpl(this._self, this._then);

  final _ReferralStatsModel _self;
  final $Res Function(_ReferralStatsModel) _then;

/// Create a copy of ReferralStatsModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? totalReferred = null,Object? totalRewarded = null,Object? totalRewardEarned = null,}) {
  return _then(_ReferralStatsModel(
totalReferred: null == totalReferred ? _self.totalReferred : totalReferred // ignore: cast_nullable_to_non_nullable
as int,totalRewarded: null == totalRewarded ? _self.totalRewarded : totalRewarded // ignore: cast_nullable_to_non_nullable
as int,totalRewardEarned: null == totalRewardEarned ? _self.totalRewardEarned : totalRewardEarned // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}

// dart format on

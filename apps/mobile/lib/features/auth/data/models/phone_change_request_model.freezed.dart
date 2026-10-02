// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'phone_change_request_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PhoneChangeRequestModel {

 int get expiresIn;/// The new number, masked, e.g. `****3210`.
 String get sentTo;
/// Create a copy of PhoneChangeRequestModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PhoneChangeRequestModelCopyWith<PhoneChangeRequestModel> get copyWith => _$PhoneChangeRequestModelCopyWithImpl<PhoneChangeRequestModel>(this as PhoneChangeRequestModel, _$identity);

  /// Serializes this PhoneChangeRequestModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PhoneChangeRequestModel&&(identical(other.expiresIn, expiresIn) || other.expiresIn == expiresIn)&&(identical(other.sentTo, sentTo) || other.sentTo == sentTo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,expiresIn,sentTo);

@override
String toString() {
  return 'PhoneChangeRequestModel(expiresIn: $expiresIn, sentTo: $sentTo)';
}


}

/// @nodoc
abstract mixin class $PhoneChangeRequestModelCopyWith<$Res>  {
  factory $PhoneChangeRequestModelCopyWith(PhoneChangeRequestModel value, $Res Function(PhoneChangeRequestModel) _then) = _$PhoneChangeRequestModelCopyWithImpl;
@useResult
$Res call({
 int expiresIn, String sentTo
});




}
/// @nodoc
class _$PhoneChangeRequestModelCopyWithImpl<$Res>
    implements $PhoneChangeRequestModelCopyWith<$Res> {
  _$PhoneChangeRequestModelCopyWithImpl(this._self, this._then);

  final PhoneChangeRequestModel _self;
  final $Res Function(PhoneChangeRequestModel) _then;

/// Create a copy of PhoneChangeRequestModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? expiresIn = null,Object? sentTo = null,}) {
  return _then(_self.copyWith(
expiresIn: null == expiresIn ? _self.expiresIn : expiresIn // ignore: cast_nullable_to_non_nullable
as int,sentTo: null == sentTo ? _self.sentTo : sentTo // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [PhoneChangeRequestModel].
extension PhoneChangeRequestModelPatterns on PhoneChangeRequestModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PhoneChangeRequestModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PhoneChangeRequestModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PhoneChangeRequestModel value)  $default,){
final _that = this;
switch (_that) {
case _PhoneChangeRequestModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PhoneChangeRequestModel value)?  $default,){
final _that = this;
switch (_that) {
case _PhoneChangeRequestModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int expiresIn,  String sentTo)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PhoneChangeRequestModel() when $default != null:
return $default(_that.expiresIn,_that.sentTo);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int expiresIn,  String sentTo)  $default,) {final _that = this;
switch (_that) {
case _PhoneChangeRequestModel():
return $default(_that.expiresIn,_that.sentTo);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int expiresIn,  String sentTo)?  $default,) {final _that = this;
switch (_that) {
case _PhoneChangeRequestModel() when $default != null:
return $default(_that.expiresIn,_that.sentTo);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PhoneChangeRequestModel implements PhoneChangeRequestModel {
  const _PhoneChangeRequestModel({required this.expiresIn, required this.sentTo});
  factory _PhoneChangeRequestModel.fromJson(Map<String, dynamic> json) => _$PhoneChangeRequestModelFromJson(json);

@override final  int expiresIn;
/// The new number, masked, e.g. `****3210`.
@override final  String sentTo;

/// Create a copy of PhoneChangeRequestModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PhoneChangeRequestModelCopyWith<_PhoneChangeRequestModel> get copyWith => __$PhoneChangeRequestModelCopyWithImpl<_PhoneChangeRequestModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PhoneChangeRequestModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PhoneChangeRequestModel&&(identical(other.expiresIn, expiresIn) || other.expiresIn == expiresIn)&&(identical(other.sentTo, sentTo) || other.sentTo == sentTo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,expiresIn,sentTo);

@override
String toString() {
  return 'PhoneChangeRequestModel(expiresIn: $expiresIn, sentTo: $sentTo)';
}


}

/// @nodoc
abstract mixin class _$PhoneChangeRequestModelCopyWith<$Res> implements $PhoneChangeRequestModelCopyWith<$Res> {
  factory _$PhoneChangeRequestModelCopyWith(_PhoneChangeRequestModel value, $Res Function(_PhoneChangeRequestModel) _then) = __$PhoneChangeRequestModelCopyWithImpl;
@override @useResult
$Res call({
 int expiresIn, String sentTo
});




}
/// @nodoc
class __$PhoneChangeRequestModelCopyWithImpl<$Res>
    implements _$PhoneChangeRequestModelCopyWith<$Res> {
  __$PhoneChangeRequestModelCopyWithImpl(this._self, this._then);

  final _PhoneChangeRequestModel _self;
  final $Res Function(_PhoneChangeRequestModel) _then;

/// Create a copy of PhoneChangeRequestModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? expiresIn = null,Object? sentTo = null,}) {
  return _then(_PhoneChangeRequestModel(
expiresIn: null == expiresIn ? _self.expiresIn : expiresIn // ignore: cast_nullable_to_non_nullable
as int,sentTo: null == sentTo ? _self.sentTo : sentTo // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on

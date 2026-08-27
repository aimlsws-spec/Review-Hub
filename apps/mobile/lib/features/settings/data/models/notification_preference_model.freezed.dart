// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'notification_preference_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$NotificationPreferenceModel {

 bool get emailEnabled; bool get smsEnabled; bool get pushEnabled; bool get inAppEnabled;
/// Create a copy of NotificationPreferenceModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NotificationPreferenceModelCopyWith<NotificationPreferenceModel> get copyWith => _$NotificationPreferenceModelCopyWithImpl<NotificationPreferenceModel>(this as NotificationPreferenceModel, _$identity);

  /// Serializes this NotificationPreferenceModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NotificationPreferenceModel&&(identical(other.emailEnabled, emailEnabled) || other.emailEnabled == emailEnabled)&&(identical(other.smsEnabled, smsEnabled) || other.smsEnabled == smsEnabled)&&(identical(other.pushEnabled, pushEnabled) || other.pushEnabled == pushEnabled)&&(identical(other.inAppEnabled, inAppEnabled) || other.inAppEnabled == inAppEnabled));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,emailEnabled,smsEnabled,pushEnabled,inAppEnabled);

@override
String toString() {
  return 'NotificationPreferenceModel(emailEnabled: $emailEnabled, smsEnabled: $smsEnabled, pushEnabled: $pushEnabled, inAppEnabled: $inAppEnabled)';
}


}

/// @nodoc
abstract mixin class $NotificationPreferenceModelCopyWith<$Res>  {
  factory $NotificationPreferenceModelCopyWith(NotificationPreferenceModel value, $Res Function(NotificationPreferenceModel) _then) = _$NotificationPreferenceModelCopyWithImpl;
@useResult
$Res call({
 bool emailEnabled, bool smsEnabled, bool pushEnabled, bool inAppEnabled
});




}
/// @nodoc
class _$NotificationPreferenceModelCopyWithImpl<$Res>
    implements $NotificationPreferenceModelCopyWith<$Res> {
  _$NotificationPreferenceModelCopyWithImpl(this._self, this._then);

  final NotificationPreferenceModel _self;
  final $Res Function(NotificationPreferenceModel) _then;

/// Create a copy of NotificationPreferenceModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? emailEnabled = null,Object? smsEnabled = null,Object? pushEnabled = null,Object? inAppEnabled = null,}) {
  return _then(_self.copyWith(
emailEnabled: null == emailEnabled ? _self.emailEnabled : emailEnabled // ignore: cast_nullable_to_non_nullable
as bool,smsEnabled: null == smsEnabled ? _self.smsEnabled : smsEnabled // ignore: cast_nullable_to_non_nullable
as bool,pushEnabled: null == pushEnabled ? _self.pushEnabled : pushEnabled // ignore: cast_nullable_to_non_nullable
as bool,inAppEnabled: null == inAppEnabled ? _self.inAppEnabled : inAppEnabled // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [NotificationPreferenceModel].
extension NotificationPreferenceModelPatterns on NotificationPreferenceModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NotificationPreferenceModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NotificationPreferenceModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NotificationPreferenceModel value)  $default,){
final _that = this;
switch (_that) {
case _NotificationPreferenceModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NotificationPreferenceModel value)?  $default,){
final _that = this;
switch (_that) {
case _NotificationPreferenceModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool emailEnabled,  bool smsEnabled,  bool pushEnabled,  bool inAppEnabled)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NotificationPreferenceModel() when $default != null:
return $default(_that.emailEnabled,_that.smsEnabled,_that.pushEnabled,_that.inAppEnabled);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool emailEnabled,  bool smsEnabled,  bool pushEnabled,  bool inAppEnabled)  $default,) {final _that = this;
switch (_that) {
case _NotificationPreferenceModel():
return $default(_that.emailEnabled,_that.smsEnabled,_that.pushEnabled,_that.inAppEnabled);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool emailEnabled,  bool smsEnabled,  bool pushEnabled,  bool inAppEnabled)?  $default,) {final _that = this;
switch (_that) {
case _NotificationPreferenceModel() when $default != null:
return $default(_that.emailEnabled,_that.smsEnabled,_that.pushEnabled,_that.inAppEnabled);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NotificationPreferenceModel implements NotificationPreferenceModel {
  const _NotificationPreferenceModel({this.emailEnabled = true, this.smsEnabled = true, this.pushEnabled = true, this.inAppEnabled = true});
  factory _NotificationPreferenceModel.fromJson(Map<String, dynamic> json) => _$NotificationPreferenceModelFromJson(json);

@override@JsonKey() final  bool emailEnabled;
@override@JsonKey() final  bool smsEnabled;
@override@JsonKey() final  bool pushEnabled;
@override@JsonKey() final  bool inAppEnabled;

/// Create a copy of NotificationPreferenceModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NotificationPreferenceModelCopyWith<_NotificationPreferenceModel> get copyWith => __$NotificationPreferenceModelCopyWithImpl<_NotificationPreferenceModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NotificationPreferenceModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NotificationPreferenceModel&&(identical(other.emailEnabled, emailEnabled) || other.emailEnabled == emailEnabled)&&(identical(other.smsEnabled, smsEnabled) || other.smsEnabled == smsEnabled)&&(identical(other.pushEnabled, pushEnabled) || other.pushEnabled == pushEnabled)&&(identical(other.inAppEnabled, inAppEnabled) || other.inAppEnabled == inAppEnabled));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,emailEnabled,smsEnabled,pushEnabled,inAppEnabled);

@override
String toString() {
  return 'NotificationPreferenceModel(emailEnabled: $emailEnabled, smsEnabled: $smsEnabled, pushEnabled: $pushEnabled, inAppEnabled: $inAppEnabled)';
}


}

/// @nodoc
abstract mixin class _$NotificationPreferenceModelCopyWith<$Res> implements $NotificationPreferenceModelCopyWith<$Res> {
  factory _$NotificationPreferenceModelCopyWith(_NotificationPreferenceModel value, $Res Function(_NotificationPreferenceModel) _then) = __$NotificationPreferenceModelCopyWithImpl;
@override @useResult
$Res call({
 bool emailEnabled, bool smsEnabled, bool pushEnabled, bool inAppEnabled
});




}
/// @nodoc
class __$NotificationPreferenceModelCopyWithImpl<$Res>
    implements _$NotificationPreferenceModelCopyWith<$Res> {
  __$NotificationPreferenceModelCopyWithImpl(this._self, this._then);

  final _NotificationPreferenceModel _self;
  final $Res Function(_NotificationPreferenceModel) _then;

/// Create a copy of NotificationPreferenceModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? emailEnabled = null,Object? smsEnabled = null,Object? pushEnabled = null,Object? inAppEnabled = null,}) {
  return _then(_NotificationPreferenceModel(
emailEnabled: null == emailEnabled ? _self.emailEnabled : emailEnabled // ignore: cast_nullable_to_non_nullable
as bool,smsEnabled: null == smsEnabled ? _self.smsEnabled : smsEnabled // ignore: cast_nullable_to_non_nullable
as bool,pushEnabled: null == pushEnabled ? _self.pushEnabled : pushEnabled // ignore: cast_nullable_to_non_nullable
as bool,inAppEnabled: null == inAppEnabled ? _self.inAppEnabled : inAppEnabled // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on

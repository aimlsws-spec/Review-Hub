// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'login_challenge_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LoginChallengeModel {

 String get challengeToken;/// Seconds until the code expires.
 int get expiresIn;/// Masked email and/or phone the code went to, e.g. `j****n@example.com`.
 List<String> get sentTo;
/// Create a copy of LoginChallengeModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LoginChallengeModelCopyWith<LoginChallengeModel> get copyWith => _$LoginChallengeModelCopyWithImpl<LoginChallengeModel>(this as LoginChallengeModel, _$identity);

  /// Serializes this LoginChallengeModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LoginChallengeModel&&(identical(other.challengeToken, challengeToken) || other.challengeToken == challengeToken)&&(identical(other.expiresIn, expiresIn) || other.expiresIn == expiresIn)&&const DeepCollectionEquality().equals(other.sentTo, sentTo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,challengeToken,expiresIn,const DeepCollectionEquality().hash(sentTo));

@override
String toString() {
  return 'LoginChallengeModel(challengeToken: $challengeToken, expiresIn: $expiresIn, sentTo: $sentTo)';
}


}

/// @nodoc
abstract mixin class $LoginChallengeModelCopyWith<$Res>  {
  factory $LoginChallengeModelCopyWith(LoginChallengeModel value, $Res Function(LoginChallengeModel) _then) = _$LoginChallengeModelCopyWithImpl;
@useResult
$Res call({
 String challengeToken, int expiresIn, List<String> sentTo
});




}
/// @nodoc
class _$LoginChallengeModelCopyWithImpl<$Res>
    implements $LoginChallengeModelCopyWith<$Res> {
  _$LoginChallengeModelCopyWithImpl(this._self, this._then);

  final LoginChallengeModel _self;
  final $Res Function(LoginChallengeModel) _then;

/// Create a copy of LoginChallengeModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? challengeToken = null,Object? expiresIn = null,Object? sentTo = null,}) {
  return _then(_self.copyWith(
challengeToken: null == challengeToken ? _self.challengeToken : challengeToken // ignore: cast_nullable_to_non_nullable
as String,expiresIn: null == expiresIn ? _self.expiresIn : expiresIn // ignore: cast_nullable_to_non_nullable
as int,sentTo: null == sentTo ? _self.sentTo : sentTo // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [LoginChallengeModel].
extension LoginChallengeModelPatterns on LoginChallengeModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LoginChallengeModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LoginChallengeModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LoginChallengeModel value)  $default,){
final _that = this;
switch (_that) {
case _LoginChallengeModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LoginChallengeModel value)?  $default,){
final _that = this;
switch (_that) {
case _LoginChallengeModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String challengeToken,  int expiresIn,  List<String> sentTo)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LoginChallengeModel() when $default != null:
return $default(_that.challengeToken,_that.expiresIn,_that.sentTo);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String challengeToken,  int expiresIn,  List<String> sentTo)  $default,) {final _that = this;
switch (_that) {
case _LoginChallengeModel():
return $default(_that.challengeToken,_that.expiresIn,_that.sentTo);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String challengeToken,  int expiresIn,  List<String> sentTo)?  $default,) {final _that = this;
switch (_that) {
case _LoginChallengeModel() when $default != null:
return $default(_that.challengeToken,_that.expiresIn,_that.sentTo);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LoginChallengeModel implements LoginChallengeModel {
  const _LoginChallengeModel({required this.challengeToken, required this.expiresIn, final  List<String> sentTo = const <String>[]}): _sentTo = sentTo;
  factory _LoginChallengeModel.fromJson(Map<String, dynamic> json) => _$LoginChallengeModelFromJson(json);

@override final  String challengeToken;
/// Seconds until the code expires.
@override final  int expiresIn;
/// Masked email and/or phone the code went to, e.g. `j****n@example.com`.
 final  List<String> _sentTo;
/// Masked email and/or phone the code went to, e.g. `j****n@example.com`.
@override@JsonKey() List<String> get sentTo {
  if (_sentTo is EqualUnmodifiableListView) return _sentTo;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sentTo);
}


/// Create a copy of LoginChallengeModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LoginChallengeModelCopyWith<_LoginChallengeModel> get copyWith => __$LoginChallengeModelCopyWithImpl<_LoginChallengeModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LoginChallengeModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LoginChallengeModel&&(identical(other.challengeToken, challengeToken) || other.challengeToken == challengeToken)&&(identical(other.expiresIn, expiresIn) || other.expiresIn == expiresIn)&&const DeepCollectionEquality().equals(other._sentTo, _sentTo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,challengeToken,expiresIn,const DeepCollectionEquality().hash(_sentTo));

@override
String toString() {
  return 'LoginChallengeModel(challengeToken: $challengeToken, expiresIn: $expiresIn, sentTo: $sentTo)';
}


}

/// @nodoc
abstract mixin class _$LoginChallengeModelCopyWith<$Res> implements $LoginChallengeModelCopyWith<$Res> {
  factory _$LoginChallengeModelCopyWith(_LoginChallengeModel value, $Res Function(_LoginChallengeModel) _then) = __$LoginChallengeModelCopyWithImpl;
@override @useResult
$Res call({
 String challengeToken, int expiresIn, List<String> sentTo
});




}
/// @nodoc
class __$LoginChallengeModelCopyWithImpl<$Res>
    implements _$LoginChallengeModelCopyWith<$Res> {
  __$LoginChallengeModelCopyWithImpl(this._self, this._then);

  final _LoginChallengeModel _self;
  final $Res Function(_LoginChallengeModel) _then;

/// Create a copy of LoginChallengeModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? challengeToken = null,Object? expiresIn = null,Object? sentTo = null,}) {
  return _then(_LoginChallengeModel(
challengeToken: null == challengeToken ? _self.challengeToken : challengeToken // ignore: cast_nullable_to_non_nullable
as String,expiresIn: null == expiresIn ? _self.expiresIn : expiresIn // ignore: cast_nullable_to_non_nullable
as int,sentTo: null == sentTo ? _self._sentTo : sentTo // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}

// dart format on

// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'gamification_profile_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$GamificationProfileModel {

 String get id; String get userId; int get level; int get xp; int get currentStreak; int get longestStreak;
/// Create a copy of GamificationProfileModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$GamificationProfileModelCopyWith<GamificationProfileModel> get copyWith => _$GamificationProfileModelCopyWithImpl<GamificationProfileModel>(this as GamificationProfileModel, _$identity);

  /// Serializes this GamificationProfileModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is GamificationProfileModel&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.level, level) || other.level == level)&&(identical(other.xp, xp) || other.xp == xp)&&(identical(other.currentStreak, currentStreak) || other.currentStreak == currentStreak)&&(identical(other.longestStreak, longestStreak) || other.longestStreak == longestStreak));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,level,xp,currentStreak,longestStreak);

@override
String toString() {
  return 'GamificationProfileModel(id: $id, userId: $userId, level: $level, xp: $xp, currentStreak: $currentStreak, longestStreak: $longestStreak)';
}


}

/// @nodoc
abstract mixin class $GamificationProfileModelCopyWith<$Res>  {
  factory $GamificationProfileModelCopyWith(GamificationProfileModel value, $Res Function(GamificationProfileModel) _then) = _$GamificationProfileModelCopyWithImpl;
@useResult
$Res call({
 String id, String userId, int level, int xp, int currentStreak, int longestStreak
});




}
/// @nodoc
class _$GamificationProfileModelCopyWithImpl<$Res>
    implements $GamificationProfileModelCopyWith<$Res> {
  _$GamificationProfileModelCopyWithImpl(this._self, this._then);

  final GamificationProfileModel _self;
  final $Res Function(GamificationProfileModel) _then;

/// Create a copy of GamificationProfileModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? level = null,Object? xp = null,Object? currentStreak = null,Object? longestStreak = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,level: null == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as int,xp: null == xp ? _self.xp : xp // ignore: cast_nullable_to_non_nullable
as int,currentStreak: null == currentStreak ? _self.currentStreak : currentStreak // ignore: cast_nullable_to_non_nullable
as int,longestStreak: null == longestStreak ? _self.longestStreak : longestStreak // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [GamificationProfileModel].
extension GamificationProfileModelPatterns on GamificationProfileModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _GamificationProfileModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _GamificationProfileModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _GamificationProfileModel value)  $default,){
final _that = this;
switch (_that) {
case _GamificationProfileModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _GamificationProfileModel value)?  $default,){
final _that = this;
switch (_that) {
case _GamificationProfileModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String userId,  int level,  int xp,  int currentStreak,  int longestStreak)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _GamificationProfileModel() when $default != null:
return $default(_that.id,_that.userId,_that.level,_that.xp,_that.currentStreak,_that.longestStreak);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String userId,  int level,  int xp,  int currentStreak,  int longestStreak)  $default,) {final _that = this;
switch (_that) {
case _GamificationProfileModel():
return $default(_that.id,_that.userId,_that.level,_that.xp,_that.currentStreak,_that.longestStreak);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String userId,  int level,  int xp,  int currentStreak,  int longestStreak)?  $default,) {final _that = this;
switch (_that) {
case _GamificationProfileModel() when $default != null:
return $default(_that.id,_that.userId,_that.level,_that.xp,_that.currentStreak,_that.longestStreak);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _GamificationProfileModel implements GamificationProfileModel {
  const _GamificationProfileModel({required this.id, required this.userId, this.level = 1, this.xp = 0, this.currentStreak = 0, this.longestStreak = 0});
  factory _GamificationProfileModel.fromJson(Map<String, dynamic> json) => _$GamificationProfileModelFromJson(json);

@override final  String id;
@override final  String userId;
@override@JsonKey() final  int level;
@override@JsonKey() final  int xp;
@override@JsonKey() final  int currentStreak;
@override@JsonKey() final  int longestStreak;

/// Create a copy of GamificationProfileModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$GamificationProfileModelCopyWith<_GamificationProfileModel> get copyWith => __$GamificationProfileModelCopyWithImpl<_GamificationProfileModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$GamificationProfileModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _GamificationProfileModel&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.level, level) || other.level == level)&&(identical(other.xp, xp) || other.xp == xp)&&(identical(other.currentStreak, currentStreak) || other.currentStreak == currentStreak)&&(identical(other.longestStreak, longestStreak) || other.longestStreak == longestStreak));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,level,xp,currentStreak,longestStreak);

@override
String toString() {
  return 'GamificationProfileModel(id: $id, userId: $userId, level: $level, xp: $xp, currentStreak: $currentStreak, longestStreak: $longestStreak)';
}


}

/// @nodoc
abstract mixin class _$GamificationProfileModelCopyWith<$Res> implements $GamificationProfileModelCopyWith<$Res> {
  factory _$GamificationProfileModelCopyWith(_GamificationProfileModel value, $Res Function(_GamificationProfileModel) _then) = __$GamificationProfileModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String userId, int level, int xp, int currentStreak, int longestStreak
});




}
/// @nodoc
class __$GamificationProfileModelCopyWithImpl<$Res>
    implements _$GamificationProfileModelCopyWith<$Res> {
  __$GamificationProfileModelCopyWithImpl(this._self, this._then);

  final _GamificationProfileModel _self;
  final $Res Function(_GamificationProfileModel) _then;

/// Create a copy of GamificationProfileModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? level = null,Object? xp = null,Object? currentStreak = null,Object? longestStreak = null,}) {
  return _then(_GamificationProfileModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,level: null == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as int,xp: null == xp ? _self.xp : xp // ignore: cast_nullable_to_non_nullable
as int,currentStreak: null == currentStreak ? _self.currentStreak : currentStreak // ignore: cast_nullable_to_non_nullable
as int,longestStreak: null == longestStreak ? _self.longestStreak : longestStreak // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on

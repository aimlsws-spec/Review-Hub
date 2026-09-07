// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'redemption_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RedemptionModel {

 String get id; String get itemId; String get costAmount; String get redemptionCode; DateTime get createdAt;
/// Create a copy of RedemptionModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RedemptionModelCopyWith<RedemptionModel> get copyWith => _$RedemptionModelCopyWithImpl<RedemptionModel>(this as RedemptionModel, _$identity);

  /// Serializes this RedemptionModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RedemptionModel&&(identical(other.id, id) || other.id == id)&&(identical(other.itemId, itemId) || other.itemId == itemId)&&(identical(other.costAmount, costAmount) || other.costAmount == costAmount)&&(identical(other.redemptionCode, redemptionCode) || other.redemptionCode == redemptionCode)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,itemId,costAmount,redemptionCode,createdAt);

@override
String toString() {
  return 'RedemptionModel(id: $id, itemId: $itemId, costAmount: $costAmount, redemptionCode: $redemptionCode, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $RedemptionModelCopyWith<$Res>  {
  factory $RedemptionModelCopyWith(RedemptionModel value, $Res Function(RedemptionModel) _then) = _$RedemptionModelCopyWithImpl;
@useResult
$Res call({
 String id, String itemId, String costAmount, String redemptionCode, DateTime createdAt
});




}
/// @nodoc
class _$RedemptionModelCopyWithImpl<$Res>
    implements $RedemptionModelCopyWith<$Res> {
  _$RedemptionModelCopyWithImpl(this._self, this._then);

  final RedemptionModel _self;
  final $Res Function(RedemptionModel) _then;

/// Create a copy of RedemptionModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? itemId = null,Object? costAmount = null,Object? redemptionCode = null,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,itemId: null == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String,costAmount: null == costAmount ? _self.costAmount : costAmount // ignore: cast_nullable_to_non_nullable
as String,redemptionCode: null == redemptionCode ? _self.redemptionCode : redemptionCode // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [RedemptionModel].
extension RedemptionModelPatterns on RedemptionModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RedemptionModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RedemptionModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RedemptionModel value)  $default,){
final _that = this;
switch (_that) {
case _RedemptionModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RedemptionModel value)?  $default,){
final _that = this;
switch (_that) {
case _RedemptionModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String itemId,  String costAmount,  String redemptionCode,  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RedemptionModel() when $default != null:
return $default(_that.id,_that.itemId,_that.costAmount,_that.redemptionCode,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String itemId,  String costAmount,  String redemptionCode,  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _RedemptionModel():
return $default(_that.id,_that.itemId,_that.costAmount,_that.redemptionCode,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String itemId,  String costAmount,  String redemptionCode,  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _RedemptionModel() when $default != null:
return $default(_that.id,_that.itemId,_that.costAmount,_that.redemptionCode,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RedemptionModel implements RedemptionModel {
  const _RedemptionModel({required this.id, required this.itemId, required this.costAmount, required this.redemptionCode, required this.createdAt});
  factory _RedemptionModel.fromJson(Map<String, dynamic> json) => _$RedemptionModelFromJson(json);

@override final  String id;
@override final  String itemId;
@override final  String costAmount;
@override final  String redemptionCode;
@override final  DateTime createdAt;

/// Create a copy of RedemptionModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RedemptionModelCopyWith<_RedemptionModel> get copyWith => __$RedemptionModelCopyWithImpl<_RedemptionModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RedemptionModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RedemptionModel&&(identical(other.id, id) || other.id == id)&&(identical(other.itemId, itemId) || other.itemId == itemId)&&(identical(other.costAmount, costAmount) || other.costAmount == costAmount)&&(identical(other.redemptionCode, redemptionCode) || other.redemptionCode == redemptionCode)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,itemId,costAmount,redemptionCode,createdAt);

@override
String toString() {
  return 'RedemptionModel(id: $id, itemId: $itemId, costAmount: $costAmount, redemptionCode: $redemptionCode, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$RedemptionModelCopyWith<$Res> implements $RedemptionModelCopyWith<$Res> {
  factory _$RedemptionModelCopyWith(_RedemptionModel value, $Res Function(_RedemptionModel) _then) = __$RedemptionModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String itemId, String costAmount, String redemptionCode, DateTime createdAt
});




}
/// @nodoc
class __$RedemptionModelCopyWithImpl<$Res>
    implements _$RedemptionModelCopyWith<$Res> {
  __$RedemptionModelCopyWithImpl(this._self, this._then);

  final _RedemptionModel _self;
  final $Res Function(_RedemptionModel) _then;

/// Create a copy of RedemptionModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? itemId = null,Object? costAmount = null,Object? redemptionCode = null,Object? createdAt = null,}) {
  return _then(_RedemptionModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,itemId: null == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String,costAmount: null == costAmount ? _self.costAmount : costAmount // ignore: cast_nullable_to_non_nullable
as String,redemptionCode: null == redemptionCode ? _self.redemptionCode : redemptionCode // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on

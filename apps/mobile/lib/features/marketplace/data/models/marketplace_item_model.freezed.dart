// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'marketplace_item_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MarketplaceItemModel {

 String get id; String get title; String get description; String? get thumbnailUrl; String? get category; String get costAmount; int? get stock; bool get isActive;
/// Create a copy of MarketplaceItemModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MarketplaceItemModelCopyWith<MarketplaceItemModel> get copyWith => _$MarketplaceItemModelCopyWithImpl<MarketplaceItemModel>(this as MarketplaceItemModel, _$identity);

  /// Serializes this MarketplaceItemModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MarketplaceItemModel&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.category, category) || other.category == category)&&(identical(other.costAmount, costAmount) || other.costAmount == costAmount)&&(identical(other.stock, stock) || other.stock == stock)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,description,thumbnailUrl,category,costAmount,stock,isActive);

@override
String toString() {
  return 'MarketplaceItemModel(id: $id, title: $title, description: $description, thumbnailUrl: $thumbnailUrl, category: $category, costAmount: $costAmount, stock: $stock, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class $MarketplaceItemModelCopyWith<$Res>  {
  factory $MarketplaceItemModelCopyWith(MarketplaceItemModel value, $Res Function(MarketplaceItemModel) _then) = _$MarketplaceItemModelCopyWithImpl;
@useResult
$Res call({
 String id, String title, String description, String? thumbnailUrl, String? category, String costAmount, int? stock, bool isActive
});




}
/// @nodoc
class _$MarketplaceItemModelCopyWithImpl<$Res>
    implements $MarketplaceItemModelCopyWith<$Res> {
  _$MarketplaceItemModelCopyWithImpl(this._self, this._then);

  final MarketplaceItemModel _self;
  final $Res Function(MarketplaceItemModel) _then;

/// Create a copy of MarketplaceItemModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? description = null,Object? thumbnailUrl = freezed,Object? category = freezed,Object? costAmount = null,Object? stock = freezed,Object? isActive = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: freezed == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,costAmount: null == costAmount ? _self.costAmount : costAmount // ignore: cast_nullable_to_non_nullable
as String,stock: freezed == stock ? _self.stock : stock // ignore: cast_nullable_to_non_nullable
as int?,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [MarketplaceItemModel].
extension MarketplaceItemModelPatterns on MarketplaceItemModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MarketplaceItemModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MarketplaceItemModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MarketplaceItemModel value)  $default,){
final _that = this;
switch (_that) {
case _MarketplaceItemModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MarketplaceItemModel value)?  $default,){
final _that = this;
switch (_that) {
case _MarketplaceItemModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String description,  String? thumbnailUrl,  String? category,  String costAmount,  int? stock,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MarketplaceItemModel() when $default != null:
return $default(_that.id,_that.title,_that.description,_that.thumbnailUrl,_that.category,_that.costAmount,_that.stock,_that.isActive);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String description,  String? thumbnailUrl,  String? category,  String costAmount,  int? stock,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _MarketplaceItemModel():
return $default(_that.id,_that.title,_that.description,_that.thumbnailUrl,_that.category,_that.costAmount,_that.stock,_that.isActive);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String description,  String? thumbnailUrl,  String? category,  String costAmount,  int? stock,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _MarketplaceItemModel() when $default != null:
return $default(_that.id,_that.title,_that.description,_that.thumbnailUrl,_that.category,_that.costAmount,_that.stock,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MarketplaceItemModel implements MarketplaceItemModel {
  const _MarketplaceItemModel({required this.id, required this.title, required this.description, this.thumbnailUrl, this.category, required this.costAmount, this.stock, this.isActive = true});
  factory _MarketplaceItemModel.fromJson(Map<String, dynamic> json) => _$MarketplaceItemModelFromJson(json);

@override final  String id;
@override final  String title;
@override final  String description;
@override final  String? thumbnailUrl;
@override final  String? category;
@override final  String costAmount;
@override final  int? stock;
@override@JsonKey() final  bool isActive;

/// Create a copy of MarketplaceItemModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MarketplaceItemModelCopyWith<_MarketplaceItemModel> get copyWith => __$MarketplaceItemModelCopyWithImpl<_MarketplaceItemModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MarketplaceItemModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MarketplaceItemModel&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.category, category) || other.category == category)&&(identical(other.costAmount, costAmount) || other.costAmount == costAmount)&&(identical(other.stock, stock) || other.stock == stock)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,description,thumbnailUrl,category,costAmount,stock,isActive);

@override
String toString() {
  return 'MarketplaceItemModel(id: $id, title: $title, description: $description, thumbnailUrl: $thumbnailUrl, category: $category, costAmount: $costAmount, stock: $stock, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$MarketplaceItemModelCopyWith<$Res> implements $MarketplaceItemModelCopyWith<$Res> {
  factory _$MarketplaceItemModelCopyWith(_MarketplaceItemModel value, $Res Function(_MarketplaceItemModel) _then) = __$MarketplaceItemModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String description, String? thumbnailUrl, String? category, String costAmount, int? stock, bool isActive
});




}
/// @nodoc
class __$MarketplaceItemModelCopyWithImpl<$Res>
    implements _$MarketplaceItemModelCopyWith<$Res> {
  __$MarketplaceItemModelCopyWithImpl(this._self, this._then);

  final _MarketplaceItemModel _self;
  final $Res Function(_MarketplaceItemModel) _then;

/// Create a copy of MarketplaceItemModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? description = null,Object? thumbnailUrl = freezed,Object? category = freezed,Object? costAmount = null,Object? stock = freezed,Object? isActive = null,}) {
  return _then(_MarketplaceItemModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: freezed == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,costAmount: null == costAmount ? _self.costAmount : costAmount // ignore: cast_nullable_to_non_nullable
as String,stock: freezed == stock ? _self.stock : stock // ignore: cast_nullable_to_non_nullable
as int?,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on

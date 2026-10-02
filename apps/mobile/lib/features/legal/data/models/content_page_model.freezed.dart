// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'content_page_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ContentPageModel {

 String get slug; String get title; String get content; DateTime? get publishedAt; DateTime? get updatedAt;
/// Create a copy of ContentPageModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ContentPageModelCopyWith<ContentPageModel> get copyWith => _$ContentPageModelCopyWithImpl<ContentPageModel>(this as ContentPageModel, _$identity);

  /// Serializes this ContentPageModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ContentPageModel&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.publishedAt, publishedAt) || other.publishedAt == publishedAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,slug,title,content,publishedAt,updatedAt);

@override
String toString() {
  return 'ContentPageModel(slug: $slug, title: $title, content: $content, publishedAt: $publishedAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $ContentPageModelCopyWith<$Res>  {
  factory $ContentPageModelCopyWith(ContentPageModel value, $Res Function(ContentPageModel) _then) = _$ContentPageModelCopyWithImpl;
@useResult
$Res call({
 String slug, String title, String content, DateTime? publishedAt, DateTime? updatedAt
});




}
/// @nodoc
class _$ContentPageModelCopyWithImpl<$Res>
    implements $ContentPageModelCopyWith<$Res> {
  _$ContentPageModelCopyWithImpl(this._self, this._then);

  final ContentPageModel _self;
  final $Res Function(ContentPageModel) _then;

/// Create a copy of ContentPageModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? slug = null,Object? title = null,Object? content = null,Object? publishedAt = freezed,Object? updatedAt = freezed,}) {
  return _then(_self.copyWith(
slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,content: null == content ? _self.content : content // ignore: cast_nullable_to_non_nullable
as String,publishedAt: freezed == publishedAt ? _self.publishedAt : publishedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [ContentPageModel].
extension ContentPageModelPatterns on ContentPageModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ContentPageModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ContentPageModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ContentPageModel value)  $default,){
final _that = this;
switch (_that) {
case _ContentPageModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ContentPageModel value)?  $default,){
final _that = this;
switch (_that) {
case _ContentPageModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String slug,  String title,  String content,  DateTime? publishedAt,  DateTime? updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ContentPageModel() when $default != null:
return $default(_that.slug,_that.title,_that.content,_that.publishedAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String slug,  String title,  String content,  DateTime? publishedAt,  DateTime? updatedAt)  $default,) {final _that = this;
switch (_that) {
case _ContentPageModel():
return $default(_that.slug,_that.title,_that.content,_that.publishedAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String slug,  String title,  String content,  DateTime? publishedAt,  DateTime? updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _ContentPageModel() when $default != null:
return $default(_that.slug,_that.title,_that.content,_that.publishedAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ContentPageModel implements ContentPageModel {
  const _ContentPageModel({required this.slug, required this.title, required this.content, this.publishedAt, this.updatedAt});
  factory _ContentPageModel.fromJson(Map<String, dynamic> json) => _$ContentPageModelFromJson(json);

@override final  String slug;
@override final  String title;
@override final  String content;
@override final  DateTime? publishedAt;
@override final  DateTime? updatedAt;

/// Create a copy of ContentPageModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ContentPageModelCopyWith<_ContentPageModel> get copyWith => __$ContentPageModelCopyWithImpl<_ContentPageModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ContentPageModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ContentPageModel&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.publishedAt, publishedAt) || other.publishedAt == publishedAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,slug,title,content,publishedAt,updatedAt);

@override
String toString() {
  return 'ContentPageModel(slug: $slug, title: $title, content: $content, publishedAt: $publishedAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$ContentPageModelCopyWith<$Res> implements $ContentPageModelCopyWith<$Res> {
  factory _$ContentPageModelCopyWith(_ContentPageModel value, $Res Function(_ContentPageModel) _then) = __$ContentPageModelCopyWithImpl;
@override @useResult
$Res call({
 String slug, String title, String content, DateTime? publishedAt, DateTime? updatedAt
});




}
/// @nodoc
class __$ContentPageModelCopyWithImpl<$Res>
    implements _$ContentPageModelCopyWith<$Res> {
  __$ContentPageModelCopyWithImpl(this._self, this._then);

  final _ContentPageModel _self;
  final $Res Function(_ContentPageModel) _then;

/// Create a copy of ContentPageModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? slug = null,Object? title = null,Object? content = null,Object? publishedAt = freezed,Object? updatedAt = freezed,}) {
  return _then(_ContentPageModel(
slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,content: null == content ? _self.content : content // ignore: cast_nullable_to_non_nullable
as String,publishedAt: freezed == publishedAt ? _self.publishedAt : publishedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on

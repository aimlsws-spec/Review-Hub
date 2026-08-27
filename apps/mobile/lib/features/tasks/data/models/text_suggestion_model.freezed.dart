// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'text_suggestion_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$TextSuggestionModel {

 String get suggestion; String get source;
/// Create a copy of TextSuggestionModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TextSuggestionModelCopyWith<TextSuggestionModel> get copyWith => _$TextSuggestionModelCopyWithImpl<TextSuggestionModel>(this as TextSuggestionModel, _$identity);

  /// Serializes this TextSuggestionModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TextSuggestionModel&&(identical(other.suggestion, suggestion) || other.suggestion == suggestion)&&(identical(other.source, source) || other.source == source));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,suggestion,source);

@override
String toString() {
  return 'TextSuggestionModel(suggestion: $suggestion, source: $source)';
}


}

/// @nodoc
abstract mixin class $TextSuggestionModelCopyWith<$Res>  {
  factory $TextSuggestionModelCopyWith(TextSuggestionModel value, $Res Function(TextSuggestionModel) _then) = _$TextSuggestionModelCopyWithImpl;
@useResult
$Res call({
 String suggestion, String source
});




}
/// @nodoc
class _$TextSuggestionModelCopyWithImpl<$Res>
    implements $TextSuggestionModelCopyWith<$Res> {
  _$TextSuggestionModelCopyWithImpl(this._self, this._then);

  final TextSuggestionModel _self;
  final $Res Function(TextSuggestionModel) _then;

/// Create a copy of TextSuggestionModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? suggestion = null,Object? source = null,}) {
  return _then(_self.copyWith(
suggestion: null == suggestion ? _self.suggestion : suggestion // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [TextSuggestionModel].
extension TextSuggestionModelPatterns on TextSuggestionModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TextSuggestionModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TextSuggestionModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TextSuggestionModel value)  $default,){
final _that = this;
switch (_that) {
case _TextSuggestionModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TextSuggestionModel value)?  $default,){
final _that = this;
switch (_that) {
case _TextSuggestionModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String suggestion,  String source)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TextSuggestionModel() when $default != null:
return $default(_that.suggestion,_that.source);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String suggestion,  String source)  $default,) {final _that = this;
switch (_that) {
case _TextSuggestionModel():
return $default(_that.suggestion,_that.source);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String suggestion,  String source)?  $default,) {final _that = this;
switch (_that) {
case _TextSuggestionModel() when $default != null:
return $default(_that.suggestion,_that.source);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TextSuggestionModel implements TextSuggestionModel {
  const _TextSuggestionModel({required this.suggestion, required this.source});
  factory _TextSuggestionModel.fromJson(Map<String, dynamic> json) => _$TextSuggestionModelFromJson(json);

@override final  String suggestion;
@override final  String source;

/// Create a copy of TextSuggestionModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TextSuggestionModelCopyWith<_TextSuggestionModel> get copyWith => __$TextSuggestionModelCopyWithImpl<_TextSuggestionModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TextSuggestionModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TextSuggestionModel&&(identical(other.suggestion, suggestion) || other.suggestion == suggestion)&&(identical(other.source, source) || other.source == source));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,suggestion,source);

@override
String toString() {
  return 'TextSuggestionModel(suggestion: $suggestion, source: $source)';
}


}

/// @nodoc
abstract mixin class _$TextSuggestionModelCopyWith<$Res> implements $TextSuggestionModelCopyWith<$Res> {
  factory _$TextSuggestionModelCopyWith(_TextSuggestionModel value, $Res Function(_TextSuggestionModel) _then) = __$TextSuggestionModelCopyWithImpl;
@override @useResult
$Res call({
 String suggestion, String source
});




}
/// @nodoc
class __$TextSuggestionModelCopyWithImpl<$Res>
    implements _$TextSuggestionModelCopyWith<$Res> {
  __$TextSuggestionModelCopyWithImpl(this._self, this._then);

  final _TextSuggestionModel _self;
  final $Res Function(_TextSuggestionModel) _then;

/// Create a copy of TextSuggestionModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? suggestion = null,Object? source = null,}) {
  return _then(_TextSuggestionModel(
suggestion: null == suggestion ? _self.suggestion : suggestion // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on

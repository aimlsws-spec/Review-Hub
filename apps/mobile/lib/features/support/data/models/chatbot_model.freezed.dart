// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'chatbot_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ChatSourceModel {

 String get kind; String get id; String get title;
/// Create a copy of ChatSourceModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ChatSourceModelCopyWith<ChatSourceModel> get copyWith => _$ChatSourceModelCopyWithImpl<ChatSourceModel>(this as ChatSourceModel, _$identity);

  /// Serializes this ChatSourceModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ChatSourceModel&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,kind,id,title);

@override
String toString() {
  return 'ChatSourceModel(kind: $kind, id: $id, title: $title)';
}


}

/// @nodoc
abstract mixin class $ChatSourceModelCopyWith<$Res>  {
  factory $ChatSourceModelCopyWith(ChatSourceModel value, $Res Function(ChatSourceModel) _then) = _$ChatSourceModelCopyWithImpl;
@useResult
$Res call({
 String kind, String id, String title
});




}
/// @nodoc
class _$ChatSourceModelCopyWithImpl<$Res>
    implements $ChatSourceModelCopyWith<$Res> {
  _$ChatSourceModelCopyWithImpl(this._self, this._then);

  final ChatSourceModel _self;
  final $Res Function(ChatSourceModel) _then;

/// Create a copy of ChatSourceModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? kind = null,Object? id = null,Object? title = null,}) {
  return _then(_self.copyWith(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ChatSourceModel].
extension ChatSourceModelPatterns on ChatSourceModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ChatSourceModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ChatSourceModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ChatSourceModel value)  $default,){
final _that = this;
switch (_that) {
case _ChatSourceModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ChatSourceModel value)?  $default,){
final _that = this;
switch (_that) {
case _ChatSourceModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String kind,  String id,  String title)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ChatSourceModel() when $default != null:
return $default(_that.kind,_that.id,_that.title);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String kind,  String id,  String title)  $default,) {final _that = this;
switch (_that) {
case _ChatSourceModel():
return $default(_that.kind,_that.id,_that.title);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String kind,  String id,  String title)?  $default,) {final _that = this;
switch (_that) {
case _ChatSourceModel() when $default != null:
return $default(_that.kind,_that.id,_that.title);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ChatSourceModel implements ChatSourceModel {
  const _ChatSourceModel({this.kind = '', this.id = '', this.title = ''});
  factory _ChatSourceModel.fromJson(Map<String, dynamic> json) => _$ChatSourceModelFromJson(json);

@override@JsonKey() final  String kind;
@override@JsonKey() final  String id;
@override@JsonKey() final  String title;

/// Create a copy of ChatSourceModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ChatSourceModelCopyWith<_ChatSourceModel> get copyWith => __$ChatSourceModelCopyWithImpl<_ChatSourceModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ChatSourceModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ChatSourceModel&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,kind,id,title);

@override
String toString() {
  return 'ChatSourceModel(kind: $kind, id: $id, title: $title)';
}


}

/// @nodoc
abstract mixin class _$ChatSourceModelCopyWith<$Res> implements $ChatSourceModelCopyWith<$Res> {
  factory _$ChatSourceModelCopyWith(_ChatSourceModel value, $Res Function(_ChatSourceModel) _then) = __$ChatSourceModelCopyWithImpl;
@override @useResult
$Res call({
 String kind, String id, String title
});




}
/// @nodoc
class __$ChatSourceModelCopyWithImpl<$Res>
    implements _$ChatSourceModelCopyWith<$Res> {
  __$ChatSourceModelCopyWithImpl(this._self, this._then);

  final _ChatSourceModel _self;
  final $Res Function(_ChatSourceModel) _then;

/// Create a copy of ChatSourceModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? kind = null,Object? id = null,Object? title = null,}) {
  return _then(_ChatSourceModel(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$ChatbotReplyModel {

 String get reply; bool get suggestHandoff; String get suggestedCategory; List<ChatSourceModel> get sources;
/// Create a copy of ChatbotReplyModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ChatbotReplyModelCopyWith<ChatbotReplyModel> get copyWith => _$ChatbotReplyModelCopyWithImpl<ChatbotReplyModel>(this as ChatbotReplyModel, _$identity);

  /// Serializes this ChatbotReplyModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ChatbotReplyModel&&(identical(other.reply, reply) || other.reply == reply)&&(identical(other.suggestHandoff, suggestHandoff) || other.suggestHandoff == suggestHandoff)&&(identical(other.suggestedCategory, suggestedCategory) || other.suggestedCategory == suggestedCategory)&&const DeepCollectionEquality().equals(other.sources, sources));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,reply,suggestHandoff,suggestedCategory,const DeepCollectionEquality().hash(sources));

@override
String toString() {
  return 'ChatbotReplyModel(reply: $reply, suggestHandoff: $suggestHandoff, suggestedCategory: $suggestedCategory, sources: $sources)';
}


}

/// @nodoc
abstract mixin class $ChatbotReplyModelCopyWith<$Res>  {
  factory $ChatbotReplyModelCopyWith(ChatbotReplyModel value, $Res Function(ChatbotReplyModel) _then) = _$ChatbotReplyModelCopyWithImpl;
@useResult
$Res call({
 String reply, bool suggestHandoff, String suggestedCategory, List<ChatSourceModel> sources
});




}
/// @nodoc
class _$ChatbotReplyModelCopyWithImpl<$Res>
    implements $ChatbotReplyModelCopyWith<$Res> {
  _$ChatbotReplyModelCopyWithImpl(this._self, this._then);

  final ChatbotReplyModel _self;
  final $Res Function(ChatbotReplyModel) _then;

/// Create a copy of ChatbotReplyModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? reply = null,Object? suggestHandoff = null,Object? suggestedCategory = null,Object? sources = null,}) {
  return _then(_self.copyWith(
reply: null == reply ? _self.reply : reply // ignore: cast_nullable_to_non_nullable
as String,suggestHandoff: null == suggestHandoff ? _self.suggestHandoff : suggestHandoff // ignore: cast_nullable_to_non_nullable
as bool,suggestedCategory: null == suggestedCategory ? _self.suggestedCategory : suggestedCategory // ignore: cast_nullable_to_non_nullable
as String,sources: null == sources ? _self.sources : sources // ignore: cast_nullable_to_non_nullable
as List<ChatSourceModel>,
  ));
}

}


/// Adds pattern-matching-related methods to [ChatbotReplyModel].
extension ChatbotReplyModelPatterns on ChatbotReplyModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ChatbotReplyModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ChatbotReplyModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ChatbotReplyModel value)  $default,){
final _that = this;
switch (_that) {
case _ChatbotReplyModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ChatbotReplyModel value)?  $default,){
final _that = this;
switch (_that) {
case _ChatbotReplyModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String reply,  bool suggestHandoff,  String suggestedCategory,  List<ChatSourceModel> sources)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ChatbotReplyModel() when $default != null:
return $default(_that.reply,_that.suggestHandoff,_that.suggestedCategory,_that.sources);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String reply,  bool suggestHandoff,  String suggestedCategory,  List<ChatSourceModel> sources)  $default,) {final _that = this;
switch (_that) {
case _ChatbotReplyModel():
return $default(_that.reply,_that.suggestHandoff,_that.suggestedCategory,_that.sources);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String reply,  bool suggestHandoff,  String suggestedCategory,  List<ChatSourceModel> sources)?  $default,) {final _that = this;
switch (_that) {
case _ChatbotReplyModel() when $default != null:
return $default(_that.reply,_that.suggestHandoff,_that.suggestedCategory,_that.sources);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ChatbotReplyModel implements ChatbotReplyModel {
  const _ChatbotReplyModel({this.reply = '', this.suggestHandoff = false, this.suggestedCategory = 'GENERAL', final  List<ChatSourceModel> sources = const <ChatSourceModel>[]}): _sources = sources;
  factory _ChatbotReplyModel.fromJson(Map<String, dynamic> json) => _$ChatbotReplyModelFromJson(json);

@override@JsonKey() final  String reply;
@override@JsonKey() final  bool suggestHandoff;
@override@JsonKey() final  String suggestedCategory;
 final  List<ChatSourceModel> _sources;
@override@JsonKey() List<ChatSourceModel> get sources {
  if (_sources is EqualUnmodifiableListView) return _sources;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sources);
}


/// Create a copy of ChatbotReplyModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ChatbotReplyModelCopyWith<_ChatbotReplyModel> get copyWith => __$ChatbotReplyModelCopyWithImpl<_ChatbotReplyModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ChatbotReplyModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ChatbotReplyModel&&(identical(other.reply, reply) || other.reply == reply)&&(identical(other.suggestHandoff, suggestHandoff) || other.suggestHandoff == suggestHandoff)&&(identical(other.suggestedCategory, suggestedCategory) || other.suggestedCategory == suggestedCategory)&&const DeepCollectionEquality().equals(other._sources, _sources));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,reply,suggestHandoff,suggestedCategory,const DeepCollectionEquality().hash(_sources));

@override
String toString() {
  return 'ChatbotReplyModel(reply: $reply, suggestHandoff: $suggestHandoff, suggestedCategory: $suggestedCategory, sources: $sources)';
}


}

/// @nodoc
abstract mixin class _$ChatbotReplyModelCopyWith<$Res> implements $ChatbotReplyModelCopyWith<$Res> {
  factory _$ChatbotReplyModelCopyWith(_ChatbotReplyModel value, $Res Function(_ChatbotReplyModel) _then) = __$ChatbotReplyModelCopyWithImpl;
@override @useResult
$Res call({
 String reply, bool suggestHandoff, String suggestedCategory, List<ChatSourceModel> sources
});




}
/// @nodoc
class __$ChatbotReplyModelCopyWithImpl<$Res>
    implements _$ChatbotReplyModelCopyWith<$Res> {
  __$ChatbotReplyModelCopyWithImpl(this._self, this._then);

  final _ChatbotReplyModel _self;
  final $Res Function(_ChatbotReplyModel) _then;

/// Create a copy of ChatbotReplyModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? reply = null,Object? suggestHandoff = null,Object? suggestedCategory = null,Object? sources = null,}) {
  return _then(_ChatbotReplyModel(
reply: null == reply ? _self.reply : reply // ignore: cast_nullable_to_non_nullable
as String,suggestHandoff: null == suggestHandoff ? _self.suggestHandoff : suggestHandoff // ignore: cast_nullable_to_non_nullable
as bool,suggestedCategory: null == suggestedCategory ? _self.suggestedCategory : suggestedCategory // ignore: cast_nullable_to_non_nullable
as String,sources: null == sources ? _self._sources : sources // ignore: cast_nullable_to_non_nullable
as List<ChatSourceModel>,
  ));
}


}

// dart format on

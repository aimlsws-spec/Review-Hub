// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'support_message_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SupportMessageModel {

 String get id; String get ticketId; String get senderId; String get senderType; String get message; String? get attachments; bool get internalNote; DateTime get createdAt; DateTime get updatedAt;
/// Create a copy of SupportMessageModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SupportMessageModelCopyWith<SupportMessageModel> get copyWith => _$SupportMessageModelCopyWithImpl<SupportMessageModel>(this as SupportMessageModel, _$identity);

  /// Serializes this SupportMessageModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SupportMessageModel&&(identical(other.id, id) || other.id == id)&&(identical(other.ticketId, ticketId) || other.ticketId == ticketId)&&(identical(other.senderId, senderId) || other.senderId == senderId)&&(identical(other.senderType, senderType) || other.senderType == senderType)&&(identical(other.message, message) || other.message == message)&&(identical(other.attachments, attachments) || other.attachments == attachments)&&(identical(other.internalNote, internalNote) || other.internalNote == internalNote)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,ticketId,senderId,senderType,message,attachments,internalNote,createdAt,updatedAt);

@override
String toString() {
  return 'SupportMessageModel(id: $id, ticketId: $ticketId, senderId: $senderId, senderType: $senderType, message: $message, attachments: $attachments, internalNote: $internalNote, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $SupportMessageModelCopyWith<$Res>  {
  factory $SupportMessageModelCopyWith(SupportMessageModel value, $Res Function(SupportMessageModel) _then) = _$SupportMessageModelCopyWithImpl;
@useResult
$Res call({
 String id, String ticketId, String senderId, String senderType, String message, String? attachments, bool internalNote, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class _$SupportMessageModelCopyWithImpl<$Res>
    implements $SupportMessageModelCopyWith<$Res> {
  _$SupportMessageModelCopyWithImpl(this._self, this._then);

  final SupportMessageModel _self;
  final $Res Function(SupportMessageModel) _then;

/// Create a copy of SupportMessageModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? ticketId = null,Object? senderId = null,Object? senderType = null,Object? message = null,Object? attachments = freezed,Object? internalNote = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,ticketId: null == ticketId ? _self.ticketId : ticketId // ignore: cast_nullable_to_non_nullable
as String,senderId: null == senderId ? _self.senderId : senderId // ignore: cast_nullable_to_non_nullable
as String,senderType: null == senderType ? _self.senderType : senderType // ignore: cast_nullable_to_non_nullable
as String,message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,attachments: freezed == attachments ? _self.attachments : attachments // ignore: cast_nullable_to_non_nullable
as String?,internalNote: null == internalNote ? _self.internalNote : internalNote // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [SupportMessageModel].
extension SupportMessageModelPatterns on SupportMessageModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SupportMessageModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SupportMessageModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SupportMessageModel value)  $default,){
final _that = this;
switch (_that) {
case _SupportMessageModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SupportMessageModel value)?  $default,){
final _that = this;
switch (_that) {
case _SupportMessageModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String ticketId,  String senderId,  String senderType,  String message,  String? attachments,  bool internalNote,  DateTime createdAt,  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SupportMessageModel() when $default != null:
return $default(_that.id,_that.ticketId,_that.senderId,_that.senderType,_that.message,_that.attachments,_that.internalNote,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String ticketId,  String senderId,  String senderType,  String message,  String? attachments,  bool internalNote,  DateTime createdAt,  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _SupportMessageModel():
return $default(_that.id,_that.ticketId,_that.senderId,_that.senderType,_that.message,_that.attachments,_that.internalNote,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String ticketId,  String senderId,  String senderType,  String message,  String? attachments,  bool internalNote,  DateTime createdAt,  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _SupportMessageModel() when $default != null:
return $default(_that.id,_that.ticketId,_that.senderId,_that.senderType,_that.message,_that.attachments,_that.internalNote,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SupportMessageModel implements SupportMessageModel {
  const _SupportMessageModel({required this.id, required this.ticketId, required this.senderId, required this.senderType, required this.message, this.attachments, required this.internalNote, required this.createdAt, required this.updatedAt});
  factory _SupportMessageModel.fromJson(Map<String, dynamic> json) => _$SupportMessageModelFromJson(json);

@override final  String id;
@override final  String ticketId;
@override final  String senderId;
@override final  String senderType;
@override final  String message;
@override final  String? attachments;
@override final  bool internalNote;
@override final  DateTime createdAt;
@override final  DateTime updatedAt;

/// Create a copy of SupportMessageModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SupportMessageModelCopyWith<_SupportMessageModel> get copyWith => __$SupportMessageModelCopyWithImpl<_SupportMessageModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SupportMessageModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SupportMessageModel&&(identical(other.id, id) || other.id == id)&&(identical(other.ticketId, ticketId) || other.ticketId == ticketId)&&(identical(other.senderId, senderId) || other.senderId == senderId)&&(identical(other.senderType, senderType) || other.senderType == senderType)&&(identical(other.message, message) || other.message == message)&&(identical(other.attachments, attachments) || other.attachments == attachments)&&(identical(other.internalNote, internalNote) || other.internalNote == internalNote)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,ticketId,senderId,senderType,message,attachments,internalNote,createdAt,updatedAt);

@override
String toString() {
  return 'SupportMessageModel(id: $id, ticketId: $ticketId, senderId: $senderId, senderType: $senderType, message: $message, attachments: $attachments, internalNote: $internalNote, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$SupportMessageModelCopyWith<$Res> implements $SupportMessageModelCopyWith<$Res> {
  factory _$SupportMessageModelCopyWith(_SupportMessageModel value, $Res Function(_SupportMessageModel) _then) = __$SupportMessageModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String ticketId, String senderId, String senderType, String message, String? attachments, bool internalNote, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class __$SupportMessageModelCopyWithImpl<$Res>
    implements _$SupportMessageModelCopyWith<$Res> {
  __$SupportMessageModelCopyWithImpl(this._self, this._then);

  final _SupportMessageModel _self;
  final $Res Function(_SupportMessageModel) _then;

/// Create a copy of SupportMessageModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? ticketId = null,Object? senderId = null,Object? senderType = null,Object? message = null,Object? attachments = freezed,Object? internalNote = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_SupportMessageModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,ticketId: null == ticketId ? _self.ticketId : ticketId // ignore: cast_nullable_to_non_nullable
as String,senderId: null == senderId ? _self.senderId : senderId // ignore: cast_nullable_to_non_nullable
as String,senderType: null == senderType ? _self.senderType : senderType // ignore: cast_nullable_to_non_nullable
as String,message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,attachments: freezed == attachments ? _self.attachments : attachments // ignore: cast_nullable_to_non_nullable
as String?,internalNote: null == internalNote ? _self.internalNote : internalNote // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on

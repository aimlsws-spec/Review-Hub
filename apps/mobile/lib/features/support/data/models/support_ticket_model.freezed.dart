// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'support_ticket_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SupportTicketModel {

 String get id; String? get userId; String? get merchantId; String? get assignedToId; String get subject; String get description; String get category; String get priority; String get status; DateTime? get resolvedAt; DateTime? get closedAt; DateTime get createdAt; DateTime get updatedAt; DateTime? get deletedAt; List<SupportMessageModel>? get messages;
/// Create a copy of SupportTicketModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SupportTicketModelCopyWith<SupportTicketModel> get copyWith => _$SupportTicketModelCopyWithImpl<SupportTicketModel>(this as SupportTicketModel, _$identity);

  /// Serializes this SupportTicketModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SupportTicketModel&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.merchantId, merchantId) || other.merchantId == merchantId)&&(identical(other.assignedToId, assignedToId) || other.assignedToId == assignedToId)&&(identical(other.subject, subject) || other.subject == subject)&&(identical(other.description, description) || other.description == description)&&(identical(other.category, category) || other.category == category)&&(identical(other.priority, priority) || other.priority == priority)&&(identical(other.status, status) || other.status == status)&&(identical(other.resolvedAt, resolvedAt) || other.resolvedAt == resolvedAt)&&(identical(other.closedAt, closedAt) || other.closedAt == closedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt)&&const DeepCollectionEquality().equals(other.messages, messages));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,merchantId,assignedToId,subject,description,category,priority,status,resolvedAt,closedAt,createdAt,updatedAt,deletedAt,const DeepCollectionEquality().hash(messages));

@override
String toString() {
  return 'SupportTicketModel(id: $id, userId: $userId, merchantId: $merchantId, assignedToId: $assignedToId, subject: $subject, description: $description, category: $category, priority: $priority, status: $status, resolvedAt: $resolvedAt, closedAt: $closedAt, createdAt: $createdAt, updatedAt: $updatedAt, deletedAt: $deletedAt, messages: $messages)';
}


}

/// @nodoc
abstract mixin class $SupportTicketModelCopyWith<$Res>  {
  factory $SupportTicketModelCopyWith(SupportTicketModel value, $Res Function(SupportTicketModel) _then) = _$SupportTicketModelCopyWithImpl;
@useResult
$Res call({
 String id, String? userId, String? merchantId, String? assignedToId, String subject, String description, String category, String priority, String status, DateTime? resolvedAt, DateTime? closedAt, DateTime createdAt, DateTime updatedAt, DateTime? deletedAt, List<SupportMessageModel>? messages
});




}
/// @nodoc
class _$SupportTicketModelCopyWithImpl<$Res>
    implements $SupportTicketModelCopyWith<$Res> {
  _$SupportTicketModelCopyWithImpl(this._self, this._then);

  final SupportTicketModel _self;
  final $Res Function(SupportTicketModel) _then;

/// Create a copy of SupportTicketModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = freezed,Object? merchantId = freezed,Object? assignedToId = freezed,Object? subject = null,Object? description = null,Object? category = null,Object? priority = null,Object? status = null,Object? resolvedAt = freezed,Object? closedAt = freezed,Object? createdAt = null,Object? updatedAt = null,Object? deletedAt = freezed,Object? messages = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: freezed == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String?,merchantId: freezed == merchantId ? _self.merchantId : merchantId // ignore: cast_nullable_to_non_nullable
as String?,assignedToId: freezed == assignedToId ? _self.assignedToId : assignedToId // ignore: cast_nullable_to_non_nullable
as String?,subject: null == subject ? _self.subject : subject // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String,priority: null == priority ? _self.priority : priority // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,resolvedAt: freezed == resolvedAt ? _self.resolvedAt : resolvedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,closedAt: freezed == closedAt ? _self.closedAt : closedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,messages: freezed == messages ? _self.messages : messages // ignore: cast_nullable_to_non_nullable
as List<SupportMessageModel>?,
  ));
}

}


/// Adds pattern-matching-related methods to [SupportTicketModel].
extension SupportTicketModelPatterns on SupportTicketModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SupportTicketModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SupportTicketModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SupportTicketModel value)  $default,){
final _that = this;
switch (_that) {
case _SupportTicketModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SupportTicketModel value)?  $default,){
final _that = this;
switch (_that) {
case _SupportTicketModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? userId,  String? merchantId,  String? assignedToId,  String subject,  String description,  String category,  String priority,  String status,  DateTime? resolvedAt,  DateTime? closedAt,  DateTime createdAt,  DateTime updatedAt,  DateTime? deletedAt,  List<SupportMessageModel>? messages)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SupportTicketModel() when $default != null:
return $default(_that.id,_that.userId,_that.merchantId,_that.assignedToId,_that.subject,_that.description,_that.category,_that.priority,_that.status,_that.resolvedAt,_that.closedAt,_that.createdAt,_that.updatedAt,_that.deletedAt,_that.messages);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? userId,  String? merchantId,  String? assignedToId,  String subject,  String description,  String category,  String priority,  String status,  DateTime? resolvedAt,  DateTime? closedAt,  DateTime createdAt,  DateTime updatedAt,  DateTime? deletedAt,  List<SupportMessageModel>? messages)  $default,) {final _that = this;
switch (_that) {
case _SupportTicketModel():
return $default(_that.id,_that.userId,_that.merchantId,_that.assignedToId,_that.subject,_that.description,_that.category,_that.priority,_that.status,_that.resolvedAt,_that.closedAt,_that.createdAt,_that.updatedAt,_that.deletedAt,_that.messages);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? userId,  String? merchantId,  String? assignedToId,  String subject,  String description,  String category,  String priority,  String status,  DateTime? resolvedAt,  DateTime? closedAt,  DateTime createdAt,  DateTime updatedAt,  DateTime? deletedAt,  List<SupportMessageModel>? messages)?  $default,) {final _that = this;
switch (_that) {
case _SupportTicketModel() when $default != null:
return $default(_that.id,_that.userId,_that.merchantId,_that.assignedToId,_that.subject,_that.description,_that.category,_that.priority,_that.status,_that.resolvedAt,_that.closedAt,_that.createdAt,_that.updatedAt,_that.deletedAt,_that.messages);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SupportTicketModel implements SupportTicketModel {
  const _SupportTicketModel({required this.id, this.userId, this.merchantId, this.assignedToId, required this.subject, required this.description, required this.category, required this.priority, required this.status, this.resolvedAt, this.closedAt, required this.createdAt, required this.updatedAt, this.deletedAt, final  List<SupportMessageModel>? messages}): _messages = messages;
  factory _SupportTicketModel.fromJson(Map<String, dynamic> json) => _$SupportTicketModelFromJson(json);

@override final  String id;
@override final  String? userId;
@override final  String? merchantId;
@override final  String? assignedToId;
@override final  String subject;
@override final  String description;
@override final  String category;
@override final  String priority;
@override final  String status;
@override final  DateTime? resolvedAt;
@override final  DateTime? closedAt;
@override final  DateTime createdAt;
@override final  DateTime updatedAt;
@override final  DateTime? deletedAt;
 final  List<SupportMessageModel>? _messages;
@override List<SupportMessageModel>? get messages {
  final value = _messages;
  if (value == null) return null;
  if (_messages is EqualUnmodifiableListView) return _messages;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}


/// Create a copy of SupportTicketModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SupportTicketModelCopyWith<_SupportTicketModel> get copyWith => __$SupportTicketModelCopyWithImpl<_SupportTicketModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SupportTicketModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SupportTicketModel&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.merchantId, merchantId) || other.merchantId == merchantId)&&(identical(other.assignedToId, assignedToId) || other.assignedToId == assignedToId)&&(identical(other.subject, subject) || other.subject == subject)&&(identical(other.description, description) || other.description == description)&&(identical(other.category, category) || other.category == category)&&(identical(other.priority, priority) || other.priority == priority)&&(identical(other.status, status) || other.status == status)&&(identical(other.resolvedAt, resolvedAt) || other.resolvedAt == resolvedAt)&&(identical(other.closedAt, closedAt) || other.closedAt == closedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt)&&const DeepCollectionEquality().equals(other._messages, _messages));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,merchantId,assignedToId,subject,description,category,priority,status,resolvedAt,closedAt,createdAt,updatedAt,deletedAt,const DeepCollectionEquality().hash(_messages));

@override
String toString() {
  return 'SupportTicketModel(id: $id, userId: $userId, merchantId: $merchantId, assignedToId: $assignedToId, subject: $subject, description: $description, category: $category, priority: $priority, status: $status, resolvedAt: $resolvedAt, closedAt: $closedAt, createdAt: $createdAt, updatedAt: $updatedAt, deletedAt: $deletedAt, messages: $messages)';
}


}

/// @nodoc
abstract mixin class _$SupportTicketModelCopyWith<$Res> implements $SupportTicketModelCopyWith<$Res> {
  factory _$SupportTicketModelCopyWith(_SupportTicketModel value, $Res Function(_SupportTicketModel) _then) = __$SupportTicketModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String? userId, String? merchantId, String? assignedToId, String subject, String description, String category, String priority, String status, DateTime? resolvedAt, DateTime? closedAt, DateTime createdAt, DateTime updatedAt, DateTime? deletedAt, List<SupportMessageModel>? messages
});




}
/// @nodoc
class __$SupportTicketModelCopyWithImpl<$Res>
    implements _$SupportTicketModelCopyWith<$Res> {
  __$SupportTicketModelCopyWithImpl(this._self, this._then);

  final _SupportTicketModel _self;
  final $Res Function(_SupportTicketModel) _then;

/// Create a copy of SupportTicketModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = freezed,Object? merchantId = freezed,Object? assignedToId = freezed,Object? subject = null,Object? description = null,Object? category = null,Object? priority = null,Object? status = null,Object? resolvedAt = freezed,Object? closedAt = freezed,Object? createdAt = null,Object? updatedAt = null,Object? deletedAt = freezed,Object? messages = freezed,}) {
  return _then(_SupportTicketModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: freezed == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String?,merchantId: freezed == merchantId ? _self.merchantId : merchantId // ignore: cast_nullable_to_non_nullable
as String?,assignedToId: freezed == assignedToId ? _self.assignedToId : assignedToId // ignore: cast_nullable_to_non_nullable
as String?,subject: null == subject ? _self.subject : subject // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String,priority: null == priority ? _self.priority : priority // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,resolvedAt: freezed == resolvedAt ? _self.resolvedAt : resolvedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,closedAt: freezed == closedAt ? _self.closedAt : closedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,messages: freezed == messages ? _self._messages : messages // ignore: cast_nullable_to_non_nullable
as List<SupportMessageModel>?,
  ));
}


}

// dart format on

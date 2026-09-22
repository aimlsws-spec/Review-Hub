// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'chat_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ChatMessage {

 ChatRole get role; String get text; List<String> get sourceTitles; bool get isError;
/// Create a copy of ChatMessage
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ChatMessageCopyWith<ChatMessage> get copyWith => _$ChatMessageCopyWithImpl<ChatMessage>(this as ChatMessage, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ChatMessage&&(identical(other.role, role) || other.role == role)&&(identical(other.text, text) || other.text == text)&&const DeepCollectionEquality().equals(other.sourceTitles, sourceTitles)&&(identical(other.isError, isError) || other.isError == isError));
}


@override
int get hashCode => Object.hash(runtimeType,role,text,const DeepCollectionEquality().hash(sourceTitles),isError);

@override
String toString() {
  return 'ChatMessage(role: $role, text: $text, sourceTitles: $sourceTitles, isError: $isError)';
}


}

/// @nodoc
abstract mixin class $ChatMessageCopyWith<$Res>  {
  factory $ChatMessageCopyWith(ChatMessage value, $Res Function(ChatMessage) _then) = _$ChatMessageCopyWithImpl;
@useResult
$Res call({
 ChatRole role, String text, List<String> sourceTitles, bool isError
});




}
/// @nodoc
class _$ChatMessageCopyWithImpl<$Res>
    implements $ChatMessageCopyWith<$Res> {
  _$ChatMessageCopyWithImpl(this._self, this._then);

  final ChatMessage _self;
  final $Res Function(ChatMessage) _then;

/// Create a copy of ChatMessage
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? role = null,Object? text = null,Object? sourceTitles = null,Object? isError = null,}) {
  return _then(_self.copyWith(
role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as ChatRole,text: null == text ? _self.text : text // ignore: cast_nullable_to_non_nullable
as String,sourceTitles: null == sourceTitles ? _self.sourceTitles : sourceTitles // ignore: cast_nullable_to_non_nullable
as List<String>,isError: null == isError ? _self.isError : isError // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [ChatMessage].
extension ChatMessagePatterns on ChatMessage {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ChatMessage value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ChatMessage() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ChatMessage value)  $default,){
final _that = this;
switch (_that) {
case _ChatMessage():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ChatMessage value)?  $default,){
final _that = this;
switch (_that) {
case _ChatMessage() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ChatRole role,  String text,  List<String> sourceTitles,  bool isError)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ChatMessage() when $default != null:
return $default(_that.role,_that.text,_that.sourceTitles,_that.isError);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ChatRole role,  String text,  List<String> sourceTitles,  bool isError)  $default,) {final _that = this;
switch (_that) {
case _ChatMessage():
return $default(_that.role,_that.text,_that.sourceTitles,_that.isError);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ChatRole role,  String text,  List<String> sourceTitles,  bool isError)?  $default,) {final _that = this;
switch (_that) {
case _ChatMessage() when $default != null:
return $default(_that.role,_that.text,_that.sourceTitles,_that.isError);case _:
  return null;

}
}

}

/// @nodoc


class _ChatMessage implements ChatMessage {
  const _ChatMessage({required this.role, required this.text, final  List<String> sourceTitles = const <String>[], this.isError = false}): _sourceTitles = sourceTitles;
  

@override final  ChatRole role;
@override final  String text;
 final  List<String> _sourceTitles;
@override@JsonKey() List<String> get sourceTitles {
  if (_sourceTitles is EqualUnmodifiableListView) return _sourceTitles;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sourceTitles);
}

@override@JsonKey() final  bool isError;

/// Create a copy of ChatMessage
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ChatMessageCopyWith<_ChatMessage> get copyWith => __$ChatMessageCopyWithImpl<_ChatMessage>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ChatMessage&&(identical(other.role, role) || other.role == role)&&(identical(other.text, text) || other.text == text)&&const DeepCollectionEquality().equals(other._sourceTitles, _sourceTitles)&&(identical(other.isError, isError) || other.isError == isError));
}


@override
int get hashCode => Object.hash(runtimeType,role,text,const DeepCollectionEquality().hash(_sourceTitles),isError);

@override
String toString() {
  return 'ChatMessage(role: $role, text: $text, sourceTitles: $sourceTitles, isError: $isError)';
}


}

/// @nodoc
abstract mixin class _$ChatMessageCopyWith<$Res> implements $ChatMessageCopyWith<$Res> {
  factory _$ChatMessageCopyWith(_ChatMessage value, $Res Function(_ChatMessage) _then) = __$ChatMessageCopyWithImpl;
@override @useResult
$Res call({
 ChatRole role, String text, List<String> sourceTitles, bool isError
});




}
/// @nodoc
class __$ChatMessageCopyWithImpl<$Res>
    implements _$ChatMessageCopyWith<$Res> {
  __$ChatMessageCopyWithImpl(this._self, this._then);

  final _ChatMessage _self;
  final $Res Function(_ChatMessage) _then;

/// Create a copy of ChatMessage
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? role = null,Object? text = null,Object? sourceTitles = null,Object? isError = null,}) {
  return _then(_ChatMessage(
role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as ChatRole,text: null == text ? _self.text : text // ignore: cast_nullable_to_non_nullable
as String,sourceTitles: null == sourceTitles ? _self._sourceTitles : sourceTitles // ignore: cast_nullable_to_non_nullable
as List<String>,isError: null == isError ? _self.isError : isError // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

/// @nodoc
mixin _$ChatState {

 List<ChatMessage> get messages; bool get isReplying; bool get isHandingOff;/// True when the assistant is unsure, so "Talk to a person" is shown prominently.
 bool get handoffSuggested; String get suggestedCategory;/// Set once the chat has been handed over; the screen then opens the ticket.
 String? get ticketId; String? get handoffError;
/// Create a copy of ChatState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ChatStateCopyWith<ChatState> get copyWith => _$ChatStateCopyWithImpl<ChatState>(this as ChatState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ChatState&&const DeepCollectionEquality().equals(other.messages, messages)&&(identical(other.isReplying, isReplying) || other.isReplying == isReplying)&&(identical(other.isHandingOff, isHandingOff) || other.isHandingOff == isHandingOff)&&(identical(other.handoffSuggested, handoffSuggested) || other.handoffSuggested == handoffSuggested)&&(identical(other.suggestedCategory, suggestedCategory) || other.suggestedCategory == suggestedCategory)&&(identical(other.ticketId, ticketId) || other.ticketId == ticketId)&&(identical(other.handoffError, handoffError) || other.handoffError == handoffError));
}


@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(messages),isReplying,isHandingOff,handoffSuggested,suggestedCategory,ticketId,handoffError);

@override
String toString() {
  return 'ChatState(messages: $messages, isReplying: $isReplying, isHandingOff: $isHandingOff, handoffSuggested: $handoffSuggested, suggestedCategory: $suggestedCategory, ticketId: $ticketId, handoffError: $handoffError)';
}


}

/// @nodoc
abstract mixin class $ChatStateCopyWith<$Res>  {
  factory $ChatStateCopyWith(ChatState value, $Res Function(ChatState) _then) = _$ChatStateCopyWithImpl;
@useResult
$Res call({
 List<ChatMessage> messages, bool isReplying, bool isHandingOff, bool handoffSuggested, String suggestedCategory, String? ticketId, String? handoffError
});




}
/// @nodoc
class _$ChatStateCopyWithImpl<$Res>
    implements $ChatStateCopyWith<$Res> {
  _$ChatStateCopyWithImpl(this._self, this._then);

  final ChatState _self;
  final $Res Function(ChatState) _then;

/// Create a copy of ChatState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? messages = null,Object? isReplying = null,Object? isHandingOff = null,Object? handoffSuggested = null,Object? suggestedCategory = null,Object? ticketId = freezed,Object? handoffError = freezed,}) {
  return _then(_self.copyWith(
messages: null == messages ? _self.messages : messages // ignore: cast_nullable_to_non_nullable
as List<ChatMessage>,isReplying: null == isReplying ? _self.isReplying : isReplying // ignore: cast_nullable_to_non_nullable
as bool,isHandingOff: null == isHandingOff ? _self.isHandingOff : isHandingOff // ignore: cast_nullable_to_non_nullable
as bool,handoffSuggested: null == handoffSuggested ? _self.handoffSuggested : handoffSuggested // ignore: cast_nullable_to_non_nullable
as bool,suggestedCategory: null == suggestedCategory ? _self.suggestedCategory : suggestedCategory // ignore: cast_nullable_to_non_nullable
as String,ticketId: freezed == ticketId ? _self.ticketId : ticketId // ignore: cast_nullable_to_non_nullable
as String?,handoffError: freezed == handoffError ? _self.handoffError : handoffError // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ChatState].
extension ChatStatePatterns on ChatState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ChatState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ChatState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ChatState value)  $default,){
final _that = this;
switch (_that) {
case _ChatState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ChatState value)?  $default,){
final _that = this;
switch (_that) {
case _ChatState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<ChatMessage> messages,  bool isReplying,  bool isHandingOff,  bool handoffSuggested,  String suggestedCategory,  String? ticketId,  String? handoffError)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ChatState() when $default != null:
return $default(_that.messages,_that.isReplying,_that.isHandingOff,_that.handoffSuggested,_that.suggestedCategory,_that.ticketId,_that.handoffError);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<ChatMessage> messages,  bool isReplying,  bool isHandingOff,  bool handoffSuggested,  String suggestedCategory,  String? ticketId,  String? handoffError)  $default,) {final _that = this;
switch (_that) {
case _ChatState():
return $default(_that.messages,_that.isReplying,_that.isHandingOff,_that.handoffSuggested,_that.suggestedCategory,_that.ticketId,_that.handoffError);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<ChatMessage> messages,  bool isReplying,  bool isHandingOff,  bool handoffSuggested,  String suggestedCategory,  String? ticketId,  String? handoffError)?  $default,) {final _that = this;
switch (_that) {
case _ChatState() when $default != null:
return $default(_that.messages,_that.isReplying,_that.isHandingOff,_that.handoffSuggested,_that.suggestedCategory,_that.ticketId,_that.handoffError);case _:
  return null;

}
}

}

/// @nodoc


class _ChatState implements ChatState {
  const _ChatState({final  List<ChatMessage> messages = const <ChatMessage>[], this.isReplying = false, this.isHandingOff = false, this.handoffSuggested = false, this.suggestedCategory = 'GENERAL', this.ticketId, this.handoffError}): _messages = messages;
  

 final  List<ChatMessage> _messages;
@override@JsonKey() List<ChatMessage> get messages {
  if (_messages is EqualUnmodifiableListView) return _messages;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_messages);
}

@override@JsonKey() final  bool isReplying;
@override@JsonKey() final  bool isHandingOff;
/// True when the assistant is unsure, so "Talk to a person" is shown prominently.
@override@JsonKey() final  bool handoffSuggested;
@override@JsonKey() final  String suggestedCategory;
/// Set once the chat has been handed over; the screen then opens the ticket.
@override final  String? ticketId;
@override final  String? handoffError;

/// Create a copy of ChatState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ChatStateCopyWith<_ChatState> get copyWith => __$ChatStateCopyWithImpl<_ChatState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ChatState&&const DeepCollectionEquality().equals(other._messages, _messages)&&(identical(other.isReplying, isReplying) || other.isReplying == isReplying)&&(identical(other.isHandingOff, isHandingOff) || other.isHandingOff == isHandingOff)&&(identical(other.handoffSuggested, handoffSuggested) || other.handoffSuggested == handoffSuggested)&&(identical(other.suggestedCategory, suggestedCategory) || other.suggestedCategory == suggestedCategory)&&(identical(other.ticketId, ticketId) || other.ticketId == ticketId)&&(identical(other.handoffError, handoffError) || other.handoffError == handoffError));
}


@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_messages),isReplying,isHandingOff,handoffSuggested,suggestedCategory,ticketId,handoffError);

@override
String toString() {
  return 'ChatState(messages: $messages, isReplying: $isReplying, isHandingOff: $isHandingOff, handoffSuggested: $handoffSuggested, suggestedCategory: $suggestedCategory, ticketId: $ticketId, handoffError: $handoffError)';
}


}

/// @nodoc
abstract mixin class _$ChatStateCopyWith<$Res> implements $ChatStateCopyWith<$Res> {
  factory _$ChatStateCopyWith(_ChatState value, $Res Function(_ChatState) _then) = __$ChatStateCopyWithImpl;
@override @useResult
$Res call({
 List<ChatMessage> messages, bool isReplying, bool isHandingOff, bool handoffSuggested, String suggestedCategory, String? ticketId, String? handoffError
});




}
/// @nodoc
class __$ChatStateCopyWithImpl<$Res>
    implements _$ChatStateCopyWith<$Res> {
  __$ChatStateCopyWithImpl(this._self, this._then);

  final _ChatState _self;
  final $Res Function(_ChatState) _then;

/// Create a copy of ChatState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? messages = null,Object? isReplying = null,Object? isHandingOff = null,Object? handoffSuggested = null,Object? suggestedCategory = null,Object? ticketId = freezed,Object? handoffError = freezed,}) {
  return _then(_ChatState(
messages: null == messages ? _self._messages : messages // ignore: cast_nullable_to_non_nullable
as List<ChatMessage>,isReplying: null == isReplying ? _self.isReplying : isReplying // ignore: cast_nullable_to_non_nullable
as bool,isHandingOff: null == isHandingOff ? _self.isHandingOff : isHandingOff // ignore: cast_nullable_to_non_nullable
as bool,handoffSuggested: null == handoffSuggested ? _self.handoffSuggested : handoffSuggested // ignore: cast_nullable_to_non_nullable
as bool,suggestedCategory: null == suggestedCategory ? _self.suggestedCategory : suggestedCategory // ignore: cast_nullable_to_non_nullable
as String,ticketId: freezed == ticketId ? _self.ticketId : ticketId // ignore: cast_nullable_to_non_nullable
as String?,handoffError: freezed == handoffError ? _self.handoffError : handoffError // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on

// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'task_submission_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$TaskSubmissionModel {

 String get id; String get taskId; String get status; String get verificationSource; int get attemptNumber; String? get fileUrl; String? get externalUrl; String? get textAnswer; double? get aiConfidence; String? get rejectionReason; String? get rewardAmount; DateTime? get rewardCreditedAt; DateTime get createdAt;
/// Create a copy of TaskSubmissionModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TaskSubmissionModelCopyWith<TaskSubmissionModel> get copyWith => _$TaskSubmissionModelCopyWithImpl<TaskSubmissionModel>(this as TaskSubmissionModel, _$identity);

  /// Serializes this TaskSubmissionModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TaskSubmissionModel&&(identical(other.id, id) || other.id == id)&&(identical(other.taskId, taskId) || other.taskId == taskId)&&(identical(other.status, status) || other.status == status)&&(identical(other.verificationSource, verificationSource) || other.verificationSource == verificationSource)&&(identical(other.attemptNumber, attemptNumber) || other.attemptNumber == attemptNumber)&&(identical(other.fileUrl, fileUrl) || other.fileUrl == fileUrl)&&(identical(other.externalUrl, externalUrl) || other.externalUrl == externalUrl)&&(identical(other.textAnswer, textAnswer) || other.textAnswer == textAnswer)&&(identical(other.aiConfidence, aiConfidence) || other.aiConfidence == aiConfidence)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.rewardCreditedAt, rewardCreditedAt) || other.rewardCreditedAt == rewardCreditedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,taskId,status,verificationSource,attemptNumber,fileUrl,externalUrl,textAnswer,aiConfidence,rejectionReason,rewardAmount,rewardCreditedAt,createdAt);

@override
String toString() {
  return 'TaskSubmissionModel(id: $id, taskId: $taskId, status: $status, verificationSource: $verificationSource, attemptNumber: $attemptNumber, fileUrl: $fileUrl, externalUrl: $externalUrl, textAnswer: $textAnswer, aiConfidence: $aiConfidence, rejectionReason: $rejectionReason, rewardAmount: $rewardAmount, rewardCreditedAt: $rewardCreditedAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $TaskSubmissionModelCopyWith<$Res>  {
  factory $TaskSubmissionModelCopyWith(TaskSubmissionModel value, $Res Function(TaskSubmissionModel) _then) = _$TaskSubmissionModelCopyWithImpl;
@useResult
$Res call({
 String id, String taskId, String status, String verificationSource, int attemptNumber, String? fileUrl, String? externalUrl, String? textAnswer, double? aiConfidence, String? rejectionReason, String? rewardAmount, DateTime? rewardCreditedAt, DateTime createdAt
});




}
/// @nodoc
class _$TaskSubmissionModelCopyWithImpl<$Res>
    implements $TaskSubmissionModelCopyWith<$Res> {
  _$TaskSubmissionModelCopyWithImpl(this._self, this._then);

  final TaskSubmissionModel _self;
  final $Res Function(TaskSubmissionModel) _then;

/// Create a copy of TaskSubmissionModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? taskId = null,Object? status = null,Object? verificationSource = null,Object? attemptNumber = null,Object? fileUrl = freezed,Object? externalUrl = freezed,Object? textAnswer = freezed,Object? aiConfidence = freezed,Object? rejectionReason = freezed,Object? rewardAmount = freezed,Object? rewardCreditedAt = freezed,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,taskId: null == taskId ? _self.taskId : taskId // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,verificationSource: null == verificationSource ? _self.verificationSource : verificationSource // ignore: cast_nullable_to_non_nullable
as String,attemptNumber: null == attemptNumber ? _self.attemptNumber : attemptNumber // ignore: cast_nullable_to_non_nullable
as int,fileUrl: freezed == fileUrl ? _self.fileUrl : fileUrl // ignore: cast_nullable_to_non_nullable
as String?,externalUrl: freezed == externalUrl ? _self.externalUrl : externalUrl // ignore: cast_nullable_to_non_nullable
as String?,textAnswer: freezed == textAnswer ? _self.textAnswer : textAnswer // ignore: cast_nullable_to_non_nullable
as String?,aiConfidence: freezed == aiConfidence ? _self.aiConfidence : aiConfidence // ignore: cast_nullable_to_non_nullable
as double?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,rewardAmount: freezed == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String?,rewardCreditedAt: freezed == rewardCreditedAt ? _self.rewardCreditedAt : rewardCreditedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [TaskSubmissionModel].
extension TaskSubmissionModelPatterns on TaskSubmissionModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TaskSubmissionModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TaskSubmissionModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TaskSubmissionModel value)  $default,){
final _that = this;
switch (_that) {
case _TaskSubmissionModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TaskSubmissionModel value)?  $default,){
final _that = this;
switch (_that) {
case _TaskSubmissionModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String taskId,  String status,  String verificationSource,  int attemptNumber,  String? fileUrl,  String? externalUrl,  String? textAnswer,  double? aiConfidence,  String? rejectionReason,  String? rewardAmount,  DateTime? rewardCreditedAt,  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TaskSubmissionModel() when $default != null:
return $default(_that.id,_that.taskId,_that.status,_that.verificationSource,_that.attemptNumber,_that.fileUrl,_that.externalUrl,_that.textAnswer,_that.aiConfidence,_that.rejectionReason,_that.rewardAmount,_that.rewardCreditedAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String taskId,  String status,  String verificationSource,  int attemptNumber,  String? fileUrl,  String? externalUrl,  String? textAnswer,  double? aiConfidence,  String? rejectionReason,  String? rewardAmount,  DateTime? rewardCreditedAt,  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _TaskSubmissionModel():
return $default(_that.id,_that.taskId,_that.status,_that.verificationSource,_that.attemptNumber,_that.fileUrl,_that.externalUrl,_that.textAnswer,_that.aiConfidence,_that.rejectionReason,_that.rewardAmount,_that.rewardCreditedAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String taskId,  String status,  String verificationSource,  int attemptNumber,  String? fileUrl,  String? externalUrl,  String? textAnswer,  double? aiConfidence,  String? rejectionReason,  String? rewardAmount,  DateTime? rewardCreditedAt,  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _TaskSubmissionModel() when $default != null:
return $default(_that.id,_that.taskId,_that.status,_that.verificationSource,_that.attemptNumber,_that.fileUrl,_that.externalUrl,_that.textAnswer,_that.aiConfidence,_that.rejectionReason,_that.rewardAmount,_that.rewardCreditedAt,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TaskSubmissionModel implements TaskSubmissionModel {
  const _TaskSubmissionModel({required this.id, required this.taskId, required this.status, required this.verificationSource, this.attemptNumber = 1, this.fileUrl, this.externalUrl, this.textAnswer, this.aiConfidence, this.rejectionReason, this.rewardAmount, this.rewardCreditedAt, required this.createdAt});
  factory _TaskSubmissionModel.fromJson(Map<String, dynamic> json) => _$TaskSubmissionModelFromJson(json);

@override final  String id;
@override final  String taskId;
@override final  String status;
@override final  String verificationSource;
@override@JsonKey() final  int attemptNumber;
@override final  String? fileUrl;
@override final  String? externalUrl;
@override final  String? textAnswer;
@override final  double? aiConfidence;
@override final  String? rejectionReason;
@override final  String? rewardAmount;
@override final  DateTime? rewardCreditedAt;
@override final  DateTime createdAt;

/// Create a copy of TaskSubmissionModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TaskSubmissionModelCopyWith<_TaskSubmissionModel> get copyWith => __$TaskSubmissionModelCopyWithImpl<_TaskSubmissionModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TaskSubmissionModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TaskSubmissionModel&&(identical(other.id, id) || other.id == id)&&(identical(other.taskId, taskId) || other.taskId == taskId)&&(identical(other.status, status) || other.status == status)&&(identical(other.verificationSource, verificationSource) || other.verificationSource == verificationSource)&&(identical(other.attemptNumber, attemptNumber) || other.attemptNumber == attemptNumber)&&(identical(other.fileUrl, fileUrl) || other.fileUrl == fileUrl)&&(identical(other.externalUrl, externalUrl) || other.externalUrl == externalUrl)&&(identical(other.textAnswer, textAnswer) || other.textAnswer == textAnswer)&&(identical(other.aiConfidence, aiConfidence) || other.aiConfidence == aiConfidence)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.rewardCreditedAt, rewardCreditedAt) || other.rewardCreditedAt == rewardCreditedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,taskId,status,verificationSource,attemptNumber,fileUrl,externalUrl,textAnswer,aiConfidence,rejectionReason,rewardAmount,rewardCreditedAt,createdAt);

@override
String toString() {
  return 'TaskSubmissionModel(id: $id, taskId: $taskId, status: $status, verificationSource: $verificationSource, attemptNumber: $attemptNumber, fileUrl: $fileUrl, externalUrl: $externalUrl, textAnswer: $textAnswer, aiConfidence: $aiConfidence, rejectionReason: $rejectionReason, rewardAmount: $rewardAmount, rewardCreditedAt: $rewardCreditedAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$TaskSubmissionModelCopyWith<$Res> implements $TaskSubmissionModelCopyWith<$Res> {
  factory _$TaskSubmissionModelCopyWith(_TaskSubmissionModel value, $Res Function(_TaskSubmissionModel) _then) = __$TaskSubmissionModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String taskId, String status, String verificationSource, int attemptNumber, String? fileUrl, String? externalUrl, String? textAnswer, double? aiConfidence, String? rejectionReason, String? rewardAmount, DateTime? rewardCreditedAt, DateTime createdAt
});




}
/// @nodoc
class __$TaskSubmissionModelCopyWithImpl<$Res>
    implements _$TaskSubmissionModelCopyWith<$Res> {
  __$TaskSubmissionModelCopyWithImpl(this._self, this._then);

  final _TaskSubmissionModel _self;
  final $Res Function(_TaskSubmissionModel) _then;

/// Create a copy of TaskSubmissionModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? taskId = null,Object? status = null,Object? verificationSource = null,Object? attemptNumber = null,Object? fileUrl = freezed,Object? externalUrl = freezed,Object? textAnswer = freezed,Object? aiConfidence = freezed,Object? rejectionReason = freezed,Object? rewardAmount = freezed,Object? rewardCreditedAt = freezed,Object? createdAt = null,}) {
  return _then(_TaskSubmissionModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,taskId: null == taskId ? _self.taskId : taskId // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,verificationSource: null == verificationSource ? _self.verificationSource : verificationSource // ignore: cast_nullable_to_non_nullable
as String,attemptNumber: null == attemptNumber ? _self.attemptNumber : attemptNumber // ignore: cast_nullable_to_non_nullable
as int,fileUrl: freezed == fileUrl ? _self.fileUrl : fileUrl // ignore: cast_nullable_to_non_nullable
as String?,externalUrl: freezed == externalUrl ? _self.externalUrl : externalUrl // ignore: cast_nullable_to_non_nullable
as String?,textAnswer: freezed == textAnswer ? _self.textAnswer : textAnswer // ignore: cast_nullable_to_non_nullable
as String?,aiConfidence: freezed == aiConfidence ? _self.aiConfidence : aiConfidence // ignore: cast_nullable_to_non_nullable
as double?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,rewardAmount: freezed == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String?,rewardCreditedAt: freezed == rewardCreditedAt ? _self.rewardCreditedAt : rewardCreditedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on

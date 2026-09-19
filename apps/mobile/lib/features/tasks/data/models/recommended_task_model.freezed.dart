// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'recommended_task_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RecommendedTaskModel {

 String get taskId; String get campaignId; String get title; String get campaignTitle; String? get thumbnailUrl; String get rewardAmount; int get minimumTimeSeconds; bool get isHighReward; bool get isQuickTask;
/// Create a copy of RecommendedTaskModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RecommendedTaskModelCopyWith<RecommendedTaskModel> get copyWith => _$RecommendedTaskModelCopyWithImpl<RecommendedTaskModel>(this as RecommendedTaskModel, _$identity);

  /// Serializes this RecommendedTaskModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RecommendedTaskModel&&(identical(other.taskId, taskId) || other.taskId == taskId)&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.title, title) || other.title == title)&&(identical(other.campaignTitle, campaignTitle) || other.campaignTitle == campaignTitle)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.minimumTimeSeconds, minimumTimeSeconds) || other.minimumTimeSeconds == minimumTimeSeconds)&&(identical(other.isHighReward, isHighReward) || other.isHighReward == isHighReward)&&(identical(other.isQuickTask, isQuickTask) || other.isQuickTask == isQuickTask));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,taskId,campaignId,title,campaignTitle,thumbnailUrl,rewardAmount,minimumTimeSeconds,isHighReward,isQuickTask);

@override
String toString() {
  return 'RecommendedTaskModel(taskId: $taskId, campaignId: $campaignId, title: $title, campaignTitle: $campaignTitle, thumbnailUrl: $thumbnailUrl, rewardAmount: $rewardAmount, minimumTimeSeconds: $minimumTimeSeconds, isHighReward: $isHighReward, isQuickTask: $isQuickTask)';
}


}

/// @nodoc
abstract mixin class $RecommendedTaskModelCopyWith<$Res>  {
  factory $RecommendedTaskModelCopyWith(RecommendedTaskModel value, $Res Function(RecommendedTaskModel) _then) = _$RecommendedTaskModelCopyWithImpl;
@useResult
$Res call({
 String taskId, String campaignId, String title, String campaignTitle, String? thumbnailUrl, String rewardAmount, int minimumTimeSeconds, bool isHighReward, bool isQuickTask
});




}
/// @nodoc
class _$RecommendedTaskModelCopyWithImpl<$Res>
    implements $RecommendedTaskModelCopyWith<$Res> {
  _$RecommendedTaskModelCopyWithImpl(this._self, this._then);

  final RecommendedTaskModel _self;
  final $Res Function(RecommendedTaskModel) _then;

/// Create a copy of RecommendedTaskModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? taskId = null,Object? campaignId = null,Object? title = null,Object? campaignTitle = null,Object? thumbnailUrl = freezed,Object? rewardAmount = null,Object? minimumTimeSeconds = null,Object? isHighReward = null,Object? isQuickTask = null,}) {
  return _then(_self.copyWith(
taskId: null == taskId ? _self.taskId : taskId // ignore: cast_nullable_to_non_nullable
as String,campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,campaignTitle: null == campaignTitle ? _self.campaignTitle : campaignTitle // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: freezed == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String?,rewardAmount: null == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String,minimumTimeSeconds: null == minimumTimeSeconds ? _self.minimumTimeSeconds : minimumTimeSeconds // ignore: cast_nullable_to_non_nullable
as int,isHighReward: null == isHighReward ? _self.isHighReward : isHighReward // ignore: cast_nullable_to_non_nullable
as bool,isQuickTask: null == isQuickTask ? _self.isQuickTask : isQuickTask // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [RecommendedTaskModel].
extension RecommendedTaskModelPatterns on RecommendedTaskModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RecommendedTaskModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RecommendedTaskModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RecommendedTaskModel value)  $default,){
final _that = this;
switch (_that) {
case _RecommendedTaskModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RecommendedTaskModel value)?  $default,){
final _that = this;
switch (_that) {
case _RecommendedTaskModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String taskId,  String campaignId,  String title,  String campaignTitle,  String? thumbnailUrl,  String rewardAmount,  int minimumTimeSeconds,  bool isHighReward,  bool isQuickTask)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RecommendedTaskModel() when $default != null:
return $default(_that.taskId,_that.campaignId,_that.title,_that.campaignTitle,_that.thumbnailUrl,_that.rewardAmount,_that.minimumTimeSeconds,_that.isHighReward,_that.isQuickTask);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String taskId,  String campaignId,  String title,  String campaignTitle,  String? thumbnailUrl,  String rewardAmount,  int minimumTimeSeconds,  bool isHighReward,  bool isQuickTask)  $default,) {final _that = this;
switch (_that) {
case _RecommendedTaskModel():
return $default(_that.taskId,_that.campaignId,_that.title,_that.campaignTitle,_that.thumbnailUrl,_that.rewardAmount,_that.minimumTimeSeconds,_that.isHighReward,_that.isQuickTask);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String taskId,  String campaignId,  String title,  String campaignTitle,  String? thumbnailUrl,  String rewardAmount,  int minimumTimeSeconds,  bool isHighReward,  bool isQuickTask)?  $default,) {final _that = this;
switch (_that) {
case _RecommendedTaskModel() when $default != null:
return $default(_that.taskId,_that.campaignId,_that.title,_that.campaignTitle,_that.thumbnailUrl,_that.rewardAmount,_that.minimumTimeSeconds,_that.isHighReward,_that.isQuickTask);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RecommendedTaskModel implements RecommendedTaskModel {
  const _RecommendedTaskModel({required this.taskId, required this.campaignId, required this.title, required this.campaignTitle, this.thumbnailUrl, required this.rewardAmount, required this.minimumTimeSeconds, required this.isHighReward, required this.isQuickTask});
  factory _RecommendedTaskModel.fromJson(Map<String, dynamic> json) => _$RecommendedTaskModelFromJson(json);

@override final  String taskId;
@override final  String campaignId;
@override final  String title;
@override final  String campaignTitle;
@override final  String? thumbnailUrl;
@override final  String rewardAmount;
@override final  int minimumTimeSeconds;
@override final  bool isHighReward;
@override final  bool isQuickTask;

/// Create a copy of RecommendedTaskModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RecommendedTaskModelCopyWith<_RecommendedTaskModel> get copyWith => __$RecommendedTaskModelCopyWithImpl<_RecommendedTaskModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RecommendedTaskModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RecommendedTaskModel&&(identical(other.taskId, taskId) || other.taskId == taskId)&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.title, title) || other.title == title)&&(identical(other.campaignTitle, campaignTitle) || other.campaignTitle == campaignTitle)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.minimumTimeSeconds, minimumTimeSeconds) || other.minimumTimeSeconds == minimumTimeSeconds)&&(identical(other.isHighReward, isHighReward) || other.isHighReward == isHighReward)&&(identical(other.isQuickTask, isQuickTask) || other.isQuickTask == isQuickTask));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,taskId,campaignId,title,campaignTitle,thumbnailUrl,rewardAmount,minimumTimeSeconds,isHighReward,isQuickTask);

@override
String toString() {
  return 'RecommendedTaskModel(taskId: $taskId, campaignId: $campaignId, title: $title, campaignTitle: $campaignTitle, thumbnailUrl: $thumbnailUrl, rewardAmount: $rewardAmount, minimumTimeSeconds: $minimumTimeSeconds, isHighReward: $isHighReward, isQuickTask: $isQuickTask)';
}


}

/// @nodoc
abstract mixin class _$RecommendedTaskModelCopyWith<$Res> implements $RecommendedTaskModelCopyWith<$Res> {
  factory _$RecommendedTaskModelCopyWith(_RecommendedTaskModel value, $Res Function(_RecommendedTaskModel) _then) = __$RecommendedTaskModelCopyWithImpl;
@override @useResult
$Res call({
 String taskId, String campaignId, String title, String campaignTitle, String? thumbnailUrl, String rewardAmount, int minimumTimeSeconds, bool isHighReward, bool isQuickTask
});




}
/// @nodoc
class __$RecommendedTaskModelCopyWithImpl<$Res>
    implements _$RecommendedTaskModelCopyWith<$Res> {
  __$RecommendedTaskModelCopyWithImpl(this._self, this._then);

  final _RecommendedTaskModel _self;
  final $Res Function(_RecommendedTaskModel) _then;

/// Create a copy of RecommendedTaskModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? taskId = null,Object? campaignId = null,Object? title = null,Object? campaignTitle = null,Object? thumbnailUrl = freezed,Object? rewardAmount = null,Object? minimumTimeSeconds = null,Object? isHighReward = null,Object? isQuickTask = null,}) {
  return _then(_RecommendedTaskModel(
taskId: null == taskId ? _self.taskId : taskId // ignore: cast_nullable_to_non_nullable
as String,campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,campaignTitle: null == campaignTitle ? _self.campaignTitle : campaignTitle // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: freezed == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String?,rewardAmount: null == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String,minimumTimeSeconds: null == minimumTimeSeconds ? _self.minimumTimeSeconds : minimumTimeSeconds // ignore: cast_nullable_to_non_nullable
as int,isHighReward: null == isHighReward ? _self.isHighReward : isHighReward // ignore: cast_nullable_to_non_nullable
as bool,isQuickTask: null == isQuickTask ? _self.isQuickTask : isQuickTask // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on

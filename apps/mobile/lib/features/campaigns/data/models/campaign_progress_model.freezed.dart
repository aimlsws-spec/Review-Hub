// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'campaign_progress_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$TaskProgressModel {

 String get taskId;/// A state this app does not know yet is treated as available: the server still refuses a task that is not.
@JsonKey(unknownEnumValue: TaskProgressState.available) TaskProgressState get state; DateTime? get availableAgainAt; int get timesCompleted;
/// Create a copy of TaskProgressModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TaskProgressModelCopyWith<TaskProgressModel> get copyWith => _$TaskProgressModelCopyWithImpl<TaskProgressModel>(this as TaskProgressModel, _$identity);

  /// Serializes this TaskProgressModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TaskProgressModel&&(identical(other.taskId, taskId) || other.taskId == taskId)&&(identical(other.state, state) || other.state == state)&&(identical(other.availableAgainAt, availableAgainAt) || other.availableAgainAt == availableAgainAt)&&(identical(other.timesCompleted, timesCompleted) || other.timesCompleted == timesCompleted));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,taskId,state,availableAgainAt,timesCompleted);

@override
String toString() {
  return 'TaskProgressModel(taskId: $taskId, state: $state, availableAgainAt: $availableAgainAt, timesCompleted: $timesCompleted)';
}


}

/// @nodoc
abstract mixin class $TaskProgressModelCopyWith<$Res>  {
  factory $TaskProgressModelCopyWith(TaskProgressModel value, $Res Function(TaskProgressModel) _then) = _$TaskProgressModelCopyWithImpl;
@useResult
$Res call({
 String taskId,@JsonKey(unknownEnumValue: TaskProgressState.available) TaskProgressState state, DateTime? availableAgainAt, int timesCompleted
});




}
/// @nodoc
class _$TaskProgressModelCopyWithImpl<$Res>
    implements $TaskProgressModelCopyWith<$Res> {
  _$TaskProgressModelCopyWithImpl(this._self, this._then);

  final TaskProgressModel _self;
  final $Res Function(TaskProgressModel) _then;

/// Create a copy of TaskProgressModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? taskId = null,Object? state = null,Object? availableAgainAt = freezed,Object? timesCompleted = null,}) {
  return _then(_self.copyWith(
taskId: null == taskId ? _self.taskId : taskId // ignore: cast_nullable_to_non_nullable
as String,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as TaskProgressState,availableAgainAt: freezed == availableAgainAt ? _self.availableAgainAt : availableAgainAt // ignore: cast_nullable_to_non_nullable
as DateTime?,timesCompleted: null == timesCompleted ? _self.timesCompleted : timesCompleted // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [TaskProgressModel].
extension TaskProgressModelPatterns on TaskProgressModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TaskProgressModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TaskProgressModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TaskProgressModel value)  $default,){
final _that = this;
switch (_that) {
case _TaskProgressModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TaskProgressModel value)?  $default,){
final _that = this;
switch (_that) {
case _TaskProgressModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String taskId, @JsonKey(unknownEnumValue: TaskProgressState.available)  TaskProgressState state,  DateTime? availableAgainAt,  int timesCompleted)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TaskProgressModel() when $default != null:
return $default(_that.taskId,_that.state,_that.availableAgainAt,_that.timesCompleted);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String taskId, @JsonKey(unknownEnumValue: TaskProgressState.available)  TaskProgressState state,  DateTime? availableAgainAt,  int timesCompleted)  $default,) {final _that = this;
switch (_that) {
case _TaskProgressModel():
return $default(_that.taskId,_that.state,_that.availableAgainAt,_that.timesCompleted);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String taskId, @JsonKey(unknownEnumValue: TaskProgressState.available)  TaskProgressState state,  DateTime? availableAgainAt,  int timesCompleted)?  $default,) {final _that = this;
switch (_that) {
case _TaskProgressModel() when $default != null:
return $default(_that.taskId,_that.state,_that.availableAgainAt,_that.timesCompleted);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TaskProgressModel implements TaskProgressModel {
  const _TaskProgressModel({required this.taskId, @JsonKey(unknownEnumValue: TaskProgressState.available) this.state = TaskProgressState.available, this.availableAgainAt, this.timesCompleted = 0});
  factory _TaskProgressModel.fromJson(Map<String, dynamic> json) => _$TaskProgressModelFromJson(json);

@override final  String taskId;
/// A state this app does not know yet is treated as available: the server still refuses a task that is not.
@override@JsonKey(unknownEnumValue: TaskProgressState.available) final  TaskProgressState state;
@override final  DateTime? availableAgainAt;
@override@JsonKey() final  int timesCompleted;

/// Create a copy of TaskProgressModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TaskProgressModelCopyWith<_TaskProgressModel> get copyWith => __$TaskProgressModelCopyWithImpl<_TaskProgressModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TaskProgressModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TaskProgressModel&&(identical(other.taskId, taskId) || other.taskId == taskId)&&(identical(other.state, state) || other.state == state)&&(identical(other.availableAgainAt, availableAgainAt) || other.availableAgainAt == availableAgainAt)&&(identical(other.timesCompleted, timesCompleted) || other.timesCompleted == timesCompleted));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,taskId,state,availableAgainAt,timesCompleted);

@override
String toString() {
  return 'TaskProgressModel(taskId: $taskId, state: $state, availableAgainAt: $availableAgainAt, timesCompleted: $timesCompleted)';
}


}

/// @nodoc
abstract mixin class _$TaskProgressModelCopyWith<$Res> implements $TaskProgressModelCopyWith<$Res> {
  factory _$TaskProgressModelCopyWith(_TaskProgressModel value, $Res Function(_TaskProgressModel) _then) = __$TaskProgressModelCopyWithImpl;
@override @useResult
$Res call({
 String taskId,@JsonKey(unknownEnumValue: TaskProgressState.available) TaskProgressState state, DateTime? availableAgainAt, int timesCompleted
});




}
/// @nodoc
class __$TaskProgressModelCopyWithImpl<$Res>
    implements _$TaskProgressModelCopyWith<$Res> {
  __$TaskProgressModelCopyWithImpl(this._self, this._then);

  final _TaskProgressModel _self;
  final $Res Function(_TaskProgressModel) _then;

/// Create a copy of TaskProgressModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? taskId = null,Object? state = null,Object? availableAgainAt = freezed,Object? timesCompleted = null,}) {
  return _then(_TaskProgressModel(
taskId: null == taskId ? _self.taskId : taskId // ignore: cast_nullable_to_non_nullable
as String,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as TaskProgressState,availableAgainAt: freezed == availableAgainAt ? _self.availableAgainAt : availableAgainAt // ignore: cast_nullable_to_non_nullable
as DateTime?,timesCompleted: null == timesCompleted ? _self.timesCompleted : timesCompleted // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$CampaignProgressModel {

 String get campaignId; bool get joined;/// Every task is completed for good: nothing is left for this person in the campaign.
 bool get allDone; List<TaskProgressModel> get tasks;
/// Create a copy of CampaignProgressModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CampaignProgressModelCopyWith<CampaignProgressModel> get copyWith => _$CampaignProgressModelCopyWithImpl<CampaignProgressModel>(this as CampaignProgressModel, _$identity);

  /// Serializes this CampaignProgressModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CampaignProgressModel&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.joined, joined) || other.joined == joined)&&(identical(other.allDone, allDone) || other.allDone == allDone)&&const DeepCollectionEquality().equals(other.tasks, tasks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,campaignId,joined,allDone,const DeepCollectionEquality().hash(tasks));

@override
String toString() {
  return 'CampaignProgressModel(campaignId: $campaignId, joined: $joined, allDone: $allDone, tasks: $tasks)';
}


}

/// @nodoc
abstract mixin class $CampaignProgressModelCopyWith<$Res>  {
  factory $CampaignProgressModelCopyWith(CampaignProgressModel value, $Res Function(CampaignProgressModel) _then) = _$CampaignProgressModelCopyWithImpl;
@useResult
$Res call({
 String campaignId, bool joined, bool allDone, List<TaskProgressModel> tasks
});




}
/// @nodoc
class _$CampaignProgressModelCopyWithImpl<$Res>
    implements $CampaignProgressModelCopyWith<$Res> {
  _$CampaignProgressModelCopyWithImpl(this._self, this._then);

  final CampaignProgressModel _self;
  final $Res Function(CampaignProgressModel) _then;

/// Create a copy of CampaignProgressModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? campaignId = null,Object? joined = null,Object? allDone = null,Object? tasks = null,}) {
  return _then(_self.copyWith(
campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,joined: null == joined ? _self.joined : joined // ignore: cast_nullable_to_non_nullable
as bool,allDone: null == allDone ? _self.allDone : allDone // ignore: cast_nullable_to_non_nullable
as bool,tasks: null == tasks ? _self.tasks : tasks // ignore: cast_nullable_to_non_nullable
as List<TaskProgressModel>,
  ));
}

}


/// Adds pattern-matching-related methods to [CampaignProgressModel].
extension CampaignProgressModelPatterns on CampaignProgressModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CampaignProgressModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CampaignProgressModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CampaignProgressModel value)  $default,){
final _that = this;
switch (_that) {
case _CampaignProgressModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CampaignProgressModel value)?  $default,){
final _that = this;
switch (_that) {
case _CampaignProgressModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String campaignId,  bool joined,  bool allDone,  List<TaskProgressModel> tasks)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CampaignProgressModel() when $default != null:
return $default(_that.campaignId,_that.joined,_that.allDone,_that.tasks);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String campaignId,  bool joined,  bool allDone,  List<TaskProgressModel> tasks)  $default,) {final _that = this;
switch (_that) {
case _CampaignProgressModel():
return $default(_that.campaignId,_that.joined,_that.allDone,_that.tasks);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String campaignId,  bool joined,  bool allDone,  List<TaskProgressModel> tasks)?  $default,) {final _that = this;
switch (_that) {
case _CampaignProgressModel() when $default != null:
return $default(_that.campaignId,_that.joined,_that.allDone,_that.tasks);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CampaignProgressModel implements CampaignProgressModel {
  const _CampaignProgressModel({required this.campaignId, this.joined = false, this.allDone = false, final  List<TaskProgressModel> tasks = const <TaskProgressModel>[]}): _tasks = tasks;
  factory _CampaignProgressModel.fromJson(Map<String, dynamic> json) => _$CampaignProgressModelFromJson(json);

@override final  String campaignId;
@override@JsonKey() final  bool joined;
/// Every task is completed for good: nothing is left for this person in the campaign.
@override@JsonKey() final  bool allDone;
 final  List<TaskProgressModel> _tasks;
@override@JsonKey() List<TaskProgressModel> get tasks {
  if (_tasks is EqualUnmodifiableListView) return _tasks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tasks);
}


/// Create a copy of CampaignProgressModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CampaignProgressModelCopyWith<_CampaignProgressModel> get copyWith => __$CampaignProgressModelCopyWithImpl<_CampaignProgressModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CampaignProgressModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CampaignProgressModel&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.joined, joined) || other.joined == joined)&&(identical(other.allDone, allDone) || other.allDone == allDone)&&const DeepCollectionEquality().equals(other._tasks, _tasks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,campaignId,joined,allDone,const DeepCollectionEquality().hash(_tasks));

@override
String toString() {
  return 'CampaignProgressModel(campaignId: $campaignId, joined: $joined, allDone: $allDone, tasks: $tasks)';
}


}

/// @nodoc
abstract mixin class _$CampaignProgressModelCopyWith<$Res> implements $CampaignProgressModelCopyWith<$Res> {
  factory _$CampaignProgressModelCopyWith(_CampaignProgressModel value, $Res Function(_CampaignProgressModel) _then) = __$CampaignProgressModelCopyWithImpl;
@override @useResult
$Res call({
 String campaignId, bool joined, bool allDone, List<TaskProgressModel> tasks
});




}
/// @nodoc
class __$CampaignProgressModelCopyWithImpl<$Res>
    implements _$CampaignProgressModelCopyWith<$Res> {
  __$CampaignProgressModelCopyWithImpl(this._self, this._then);

  final _CampaignProgressModel _self;
  final $Res Function(_CampaignProgressModel) _then;

/// Create a copy of CampaignProgressModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? campaignId = null,Object? joined = null,Object? allDone = null,Object? tasks = null,}) {
  return _then(_CampaignProgressModel(
campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,joined: null == joined ? _self.joined : joined // ignore: cast_nullable_to_non_nullable
as bool,allDone: null == allDone ? _self.allDone : allDone // ignore: cast_nullable_to_non_nullable
as bool,tasks: null == tasks ? _self._tasks : tasks // ignore: cast_nullable_to_non_nullable
as List<TaskProgressModel>,
  ));
}


}


/// @nodoc
mixin _$JoinedCampaignModel {

 String get campaignId; String get title; String? get thumbnailUrl; String get businessName; String get rewardAmount; String get participationStatus; String get campaignStatus; DateTime? get joinedAt; DateTime? get completedAt; int get tasksCompleted; int get tasksTotal;/// Rupees credited to the person's wallet from this campaign. Arrives as a number.
 num get earned;
/// Create a copy of JoinedCampaignModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$JoinedCampaignModelCopyWith<JoinedCampaignModel> get copyWith => _$JoinedCampaignModelCopyWithImpl<JoinedCampaignModel>(this as JoinedCampaignModel, _$identity);

  /// Serializes this JoinedCampaignModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is JoinedCampaignModel&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.title, title) || other.title == title)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.businessName, businessName) || other.businessName == businessName)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.participationStatus, participationStatus) || other.participationStatus == participationStatus)&&(identical(other.campaignStatus, campaignStatus) || other.campaignStatus == campaignStatus)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.tasksCompleted, tasksCompleted) || other.tasksCompleted == tasksCompleted)&&(identical(other.tasksTotal, tasksTotal) || other.tasksTotal == tasksTotal)&&(identical(other.earned, earned) || other.earned == earned));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,campaignId,title,thumbnailUrl,businessName,rewardAmount,participationStatus,campaignStatus,joinedAt,completedAt,tasksCompleted,tasksTotal,earned);

@override
String toString() {
  return 'JoinedCampaignModel(campaignId: $campaignId, title: $title, thumbnailUrl: $thumbnailUrl, businessName: $businessName, rewardAmount: $rewardAmount, participationStatus: $participationStatus, campaignStatus: $campaignStatus, joinedAt: $joinedAt, completedAt: $completedAt, tasksCompleted: $tasksCompleted, tasksTotal: $tasksTotal, earned: $earned)';
}


}

/// @nodoc
abstract mixin class $JoinedCampaignModelCopyWith<$Res>  {
  factory $JoinedCampaignModelCopyWith(JoinedCampaignModel value, $Res Function(JoinedCampaignModel) _then) = _$JoinedCampaignModelCopyWithImpl;
@useResult
$Res call({
 String campaignId, String title, String? thumbnailUrl, String businessName, String rewardAmount, String participationStatus, String campaignStatus, DateTime? joinedAt, DateTime? completedAt, int tasksCompleted, int tasksTotal, num earned
});




}
/// @nodoc
class _$JoinedCampaignModelCopyWithImpl<$Res>
    implements $JoinedCampaignModelCopyWith<$Res> {
  _$JoinedCampaignModelCopyWithImpl(this._self, this._then);

  final JoinedCampaignModel _self;
  final $Res Function(JoinedCampaignModel) _then;

/// Create a copy of JoinedCampaignModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? campaignId = null,Object? title = null,Object? thumbnailUrl = freezed,Object? businessName = null,Object? rewardAmount = null,Object? participationStatus = null,Object? campaignStatus = null,Object? joinedAt = freezed,Object? completedAt = freezed,Object? tasksCompleted = null,Object? tasksTotal = null,Object? earned = null,}) {
  return _then(_self.copyWith(
campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: freezed == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String?,businessName: null == businessName ? _self.businessName : businessName // ignore: cast_nullable_to_non_nullable
as String,rewardAmount: null == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String,participationStatus: null == participationStatus ? _self.participationStatus : participationStatus // ignore: cast_nullable_to_non_nullable
as String,campaignStatus: null == campaignStatus ? _self.campaignStatus : campaignStatus // ignore: cast_nullable_to_non_nullable
as String,joinedAt: freezed == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,tasksCompleted: null == tasksCompleted ? _self.tasksCompleted : tasksCompleted // ignore: cast_nullable_to_non_nullable
as int,tasksTotal: null == tasksTotal ? _self.tasksTotal : tasksTotal // ignore: cast_nullable_to_non_nullable
as int,earned: null == earned ? _self.earned : earned // ignore: cast_nullable_to_non_nullable
as num,
  ));
}

}


/// Adds pattern-matching-related methods to [JoinedCampaignModel].
extension JoinedCampaignModelPatterns on JoinedCampaignModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _JoinedCampaignModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _JoinedCampaignModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _JoinedCampaignModel value)  $default,){
final _that = this;
switch (_that) {
case _JoinedCampaignModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _JoinedCampaignModel value)?  $default,){
final _that = this;
switch (_that) {
case _JoinedCampaignModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String campaignId,  String title,  String? thumbnailUrl,  String businessName,  String rewardAmount,  String participationStatus,  String campaignStatus,  DateTime? joinedAt,  DateTime? completedAt,  int tasksCompleted,  int tasksTotal,  num earned)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _JoinedCampaignModel() when $default != null:
return $default(_that.campaignId,_that.title,_that.thumbnailUrl,_that.businessName,_that.rewardAmount,_that.participationStatus,_that.campaignStatus,_that.joinedAt,_that.completedAt,_that.tasksCompleted,_that.tasksTotal,_that.earned);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String campaignId,  String title,  String? thumbnailUrl,  String businessName,  String rewardAmount,  String participationStatus,  String campaignStatus,  DateTime? joinedAt,  DateTime? completedAt,  int tasksCompleted,  int tasksTotal,  num earned)  $default,) {final _that = this;
switch (_that) {
case _JoinedCampaignModel():
return $default(_that.campaignId,_that.title,_that.thumbnailUrl,_that.businessName,_that.rewardAmount,_that.participationStatus,_that.campaignStatus,_that.joinedAt,_that.completedAt,_that.tasksCompleted,_that.tasksTotal,_that.earned);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String campaignId,  String title,  String? thumbnailUrl,  String businessName,  String rewardAmount,  String participationStatus,  String campaignStatus,  DateTime? joinedAt,  DateTime? completedAt,  int tasksCompleted,  int tasksTotal,  num earned)?  $default,) {final _that = this;
switch (_that) {
case _JoinedCampaignModel() when $default != null:
return $default(_that.campaignId,_that.title,_that.thumbnailUrl,_that.businessName,_that.rewardAmount,_that.participationStatus,_that.campaignStatus,_that.joinedAt,_that.completedAt,_that.tasksCompleted,_that.tasksTotal,_that.earned);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _JoinedCampaignModel implements JoinedCampaignModel {
  const _JoinedCampaignModel({required this.campaignId, required this.title, this.thumbnailUrl, this.businessName = '', this.rewardAmount = '0', this.participationStatus = '', this.campaignStatus = '', this.joinedAt, this.completedAt, this.tasksCompleted = 0, this.tasksTotal = 0, this.earned = 0});
  factory _JoinedCampaignModel.fromJson(Map<String, dynamic> json) => _$JoinedCampaignModelFromJson(json);

@override final  String campaignId;
@override final  String title;
@override final  String? thumbnailUrl;
@override@JsonKey() final  String businessName;
@override@JsonKey() final  String rewardAmount;
@override@JsonKey() final  String participationStatus;
@override@JsonKey() final  String campaignStatus;
@override final  DateTime? joinedAt;
@override final  DateTime? completedAt;
@override@JsonKey() final  int tasksCompleted;
@override@JsonKey() final  int tasksTotal;
/// Rupees credited to the person's wallet from this campaign. Arrives as a number.
@override@JsonKey() final  num earned;

/// Create a copy of JoinedCampaignModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$JoinedCampaignModelCopyWith<_JoinedCampaignModel> get copyWith => __$JoinedCampaignModelCopyWithImpl<_JoinedCampaignModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$JoinedCampaignModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _JoinedCampaignModel&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.title, title) || other.title == title)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.businessName, businessName) || other.businessName == businessName)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.participationStatus, participationStatus) || other.participationStatus == participationStatus)&&(identical(other.campaignStatus, campaignStatus) || other.campaignStatus == campaignStatus)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.tasksCompleted, tasksCompleted) || other.tasksCompleted == tasksCompleted)&&(identical(other.tasksTotal, tasksTotal) || other.tasksTotal == tasksTotal)&&(identical(other.earned, earned) || other.earned == earned));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,campaignId,title,thumbnailUrl,businessName,rewardAmount,participationStatus,campaignStatus,joinedAt,completedAt,tasksCompleted,tasksTotal,earned);

@override
String toString() {
  return 'JoinedCampaignModel(campaignId: $campaignId, title: $title, thumbnailUrl: $thumbnailUrl, businessName: $businessName, rewardAmount: $rewardAmount, participationStatus: $participationStatus, campaignStatus: $campaignStatus, joinedAt: $joinedAt, completedAt: $completedAt, tasksCompleted: $tasksCompleted, tasksTotal: $tasksTotal, earned: $earned)';
}


}

/// @nodoc
abstract mixin class _$JoinedCampaignModelCopyWith<$Res> implements $JoinedCampaignModelCopyWith<$Res> {
  factory _$JoinedCampaignModelCopyWith(_JoinedCampaignModel value, $Res Function(_JoinedCampaignModel) _then) = __$JoinedCampaignModelCopyWithImpl;
@override @useResult
$Res call({
 String campaignId, String title, String? thumbnailUrl, String businessName, String rewardAmount, String participationStatus, String campaignStatus, DateTime? joinedAt, DateTime? completedAt, int tasksCompleted, int tasksTotal, num earned
});




}
/// @nodoc
class __$JoinedCampaignModelCopyWithImpl<$Res>
    implements _$JoinedCampaignModelCopyWith<$Res> {
  __$JoinedCampaignModelCopyWithImpl(this._self, this._then);

  final _JoinedCampaignModel _self;
  final $Res Function(_JoinedCampaignModel) _then;

/// Create a copy of JoinedCampaignModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? campaignId = null,Object? title = null,Object? thumbnailUrl = freezed,Object? businessName = null,Object? rewardAmount = null,Object? participationStatus = null,Object? campaignStatus = null,Object? joinedAt = freezed,Object? completedAt = freezed,Object? tasksCompleted = null,Object? tasksTotal = null,Object? earned = null,}) {
  return _then(_JoinedCampaignModel(
campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: freezed == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String?,businessName: null == businessName ? _self.businessName : businessName // ignore: cast_nullable_to_non_nullable
as String,rewardAmount: null == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String,participationStatus: null == participationStatus ? _self.participationStatus : participationStatus // ignore: cast_nullable_to_non_nullable
as String,campaignStatus: null == campaignStatus ? _self.campaignStatus : campaignStatus // ignore: cast_nullable_to_non_nullable
as String,joinedAt: freezed == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,tasksCompleted: null == tasksCompleted ? _self.tasksCompleted : tasksCompleted // ignore: cast_nullable_to_non_nullable
as int,tasksTotal: null == tasksTotal ? _self.tasksTotal : tasksTotal // ignore: cast_nullable_to_non_nullable
as int,earned: null == earned ? _self.earned : earned // ignore: cast_nullable_to_non_nullable
as num,
  ));
}


}

// dart format on

// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'campaign_task_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CampaignTaskModel {

 String get id; String get campaignId; String get title; String? get description; String? get instructions; String get taskType; String get verificationType; int get taskOrder; String? get rewardAmount; bool get required; int get minimumTimeSeconds; bool get proofRequired; String? get proofType;
/// Create a copy of CampaignTaskModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CampaignTaskModelCopyWith<CampaignTaskModel> get copyWith => _$CampaignTaskModelCopyWithImpl<CampaignTaskModel>(this as CampaignTaskModel, _$identity);

  /// Serializes this CampaignTaskModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CampaignTaskModel&&(identical(other.id, id) || other.id == id)&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.instructions, instructions) || other.instructions == instructions)&&(identical(other.taskType, taskType) || other.taskType == taskType)&&(identical(other.verificationType, verificationType) || other.verificationType == verificationType)&&(identical(other.taskOrder, taskOrder) || other.taskOrder == taskOrder)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.required, required) || other.required == required)&&(identical(other.minimumTimeSeconds, minimumTimeSeconds) || other.minimumTimeSeconds == minimumTimeSeconds)&&(identical(other.proofRequired, proofRequired) || other.proofRequired == proofRequired)&&(identical(other.proofType, proofType) || other.proofType == proofType));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,campaignId,title,description,instructions,taskType,verificationType,taskOrder,rewardAmount,required,minimumTimeSeconds,proofRequired,proofType);

@override
String toString() {
  return 'CampaignTaskModel(id: $id, campaignId: $campaignId, title: $title, description: $description, instructions: $instructions, taskType: $taskType, verificationType: $verificationType, taskOrder: $taskOrder, rewardAmount: $rewardAmount, required: $required, minimumTimeSeconds: $minimumTimeSeconds, proofRequired: $proofRequired, proofType: $proofType)';
}


}

/// @nodoc
abstract mixin class $CampaignTaskModelCopyWith<$Res>  {
  factory $CampaignTaskModelCopyWith(CampaignTaskModel value, $Res Function(CampaignTaskModel) _then) = _$CampaignTaskModelCopyWithImpl;
@useResult
$Res call({
 String id, String campaignId, String title, String? description, String? instructions, String taskType, String verificationType, int taskOrder, String? rewardAmount, bool required, int minimumTimeSeconds, bool proofRequired, String? proofType
});




}
/// @nodoc
class _$CampaignTaskModelCopyWithImpl<$Res>
    implements $CampaignTaskModelCopyWith<$Res> {
  _$CampaignTaskModelCopyWithImpl(this._self, this._then);

  final CampaignTaskModel _self;
  final $Res Function(CampaignTaskModel) _then;

/// Create a copy of CampaignTaskModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? campaignId = null,Object? title = null,Object? description = freezed,Object? instructions = freezed,Object? taskType = null,Object? verificationType = null,Object? taskOrder = null,Object? rewardAmount = freezed,Object? required = null,Object? minimumTimeSeconds = null,Object? proofRequired = null,Object? proofType = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,instructions: freezed == instructions ? _self.instructions : instructions // ignore: cast_nullable_to_non_nullable
as String?,taskType: null == taskType ? _self.taskType : taskType // ignore: cast_nullable_to_non_nullable
as String,verificationType: null == verificationType ? _self.verificationType : verificationType // ignore: cast_nullable_to_non_nullable
as String,taskOrder: null == taskOrder ? _self.taskOrder : taskOrder // ignore: cast_nullable_to_non_nullable
as int,rewardAmount: freezed == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String?,required: null == required ? _self.required : required // ignore: cast_nullable_to_non_nullable
as bool,minimumTimeSeconds: null == minimumTimeSeconds ? _self.minimumTimeSeconds : minimumTimeSeconds // ignore: cast_nullable_to_non_nullable
as int,proofRequired: null == proofRequired ? _self.proofRequired : proofRequired // ignore: cast_nullable_to_non_nullable
as bool,proofType: freezed == proofType ? _self.proofType : proofType // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [CampaignTaskModel].
extension CampaignTaskModelPatterns on CampaignTaskModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CampaignTaskModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CampaignTaskModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CampaignTaskModel value)  $default,){
final _that = this;
switch (_that) {
case _CampaignTaskModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CampaignTaskModel value)?  $default,){
final _that = this;
switch (_that) {
case _CampaignTaskModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String campaignId,  String title,  String? description,  String? instructions,  String taskType,  String verificationType,  int taskOrder,  String? rewardAmount,  bool required,  int minimumTimeSeconds,  bool proofRequired,  String? proofType)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CampaignTaskModel() when $default != null:
return $default(_that.id,_that.campaignId,_that.title,_that.description,_that.instructions,_that.taskType,_that.verificationType,_that.taskOrder,_that.rewardAmount,_that.required,_that.minimumTimeSeconds,_that.proofRequired,_that.proofType);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String campaignId,  String title,  String? description,  String? instructions,  String taskType,  String verificationType,  int taskOrder,  String? rewardAmount,  bool required,  int minimumTimeSeconds,  bool proofRequired,  String? proofType)  $default,) {final _that = this;
switch (_that) {
case _CampaignTaskModel():
return $default(_that.id,_that.campaignId,_that.title,_that.description,_that.instructions,_that.taskType,_that.verificationType,_that.taskOrder,_that.rewardAmount,_that.required,_that.minimumTimeSeconds,_that.proofRequired,_that.proofType);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String campaignId,  String title,  String? description,  String? instructions,  String taskType,  String verificationType,  int taskOrder,  String? rewardAmount,  bool required,  int minimumTimeSeconds,  bool proofRequired,  String? proofType)?  $default,) {final _that = this;
switch (_that) {
case _CampaignTaskModel() when $default != null:
return $default(_that.id,_that.campaignId,_that.title,_that.description,_that.instructions,_that.taskType,_that.verificationType,_that.taskOrder,_that.rewardAmount,_that.required,_that.minimumTimeSeconds,_that.proofRequired,_that.proofType);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CampaignTaskModel implements CampaignTaskModel {
  const _CampaignTaskModel({required this.id, required this.campaignId, required this.title, this.description, this.instructions, required this.taskType, required this.verificationType, this.taskOrder = 0, this.rewardAmount, this.required = true, this.minimumTimeSeconds = 0, this.proofRequired = true, this.proofType});
  factory _CampaignTaskModel.fromJson(Map<String, dynamic> json) => _$CampaignTaskModelFromJson(json);

@override final  String id;
@override final  String campaignId;
@override final  String title;
@override final  String? description;
@override final  String? instructions;
@override final  String taskType;
@override final  String verificationType;
@override@JsonKey() final  int taskOrder;
@override final  String? rewardAmount;
@override@JsonKey() final  bool required;
@override@JsonKey() final  int minimumTimeSeconds;
@override@JsonKey() final  bool proofRequired;
@override final  String? proofType;

/// Create a copy of CampaignTaskModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CampaignTaskModelCopyWith<_CampaignTaskModel> get copyWith => __$CampaignTaskModelCopyWithImpl<_CampaignTaskModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CampaignTaskModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CampaignTaskModel&&(identical(other.id, id) || other.id == id)&&(identical(other.campaignId, campaignId) || other.campaignId == campaignId)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.instructions, instructions) || other.instructions == instructions)&&(identical(other.taskType, taskType) || other.taskType == taskType)&&(identical(other.verificationType, verificationType) || other.verificationType == verificationType)&&(identical(other.taskOrder, taskOrder) || other.taskOrder == taskOrder)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.required, required) || other.required == required)&&(identical(other.minimumTimeSeconds, minimumTimeSeconds) || other.minimumTimeSeconds == minimumTimeSeconds)&&(identical(other.proofRequired, proofRequired) || other.proofRequired == proofRequired)&&(identical(other.proofType, proofType) || other.proofType == proofType));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,campaignId,title,description,instructions,taskType,verificationType,taskOrder,rewardAmount,required,minimumTimeSeconds,proofRequired,proofType);

@override
String toString() {
  return 'CampaignTaskModel(id: $id, campaignId: $campaignId, title: $title, description: $description, instructions: $instructions, taskType: $taskType, verificationType: $verificationType, taskOrder: $taskOrder, rewardAmount: $rewardAmount, required: $required, minimumTimeSeconds: $minimumTimeSeconds, proofRequired: $proofRequired, proofType: $proofType)';
}


}

/// @nodoc
abstract mixin class _$CampaignTaskModelCopyWith<$Res> implements $CampaignTaskModelCopyWith<$Res> {
  factory _$CampaignTaskModelCopyWith(_CampaignTaskModel value, $Res Function(_CampaignTaskModel) _then) = __$CampaignTaskModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String campaignId, String title, String? description, String? instructions, String taskType, String verificationType, int taskOrder, String? rewardAmount, bool required, int minimumTimeSeconds, bool proofRequired, String? proofType
});




}
/// @nodoc
class __$CampaignTaskModelCopyWithImpl<$Res>
    implements _$CampaignTaskModelCopyWith<$Res> {
  __$CampaignTaskModelCopyWithImpl(this._self, this._then);

  final _CampaignTaskModel _self;
  final $Res Function(_CampaignTaskModel) _then;

/// Create a copy of CampaignTaskModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? campaignId = null,Object? title = null,Object? description = freezed,Object? instructions = freezed,Object? taskType = null,Object? verificationType = null,Object? taskOrder = null,Object? rewardAmount = freezed,Object? required = null,Object? minimumTimeSeconds = null,Object? proofRequired = null,Object? proofType = freezed,}) {
  return _then(_CampaignTaskModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,campaignId: null == campaignId ? _self.campaignId : campaignId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,instructions: freezed == instructions ? _self.instructions : instructions // ignore: cast_nullable_to_non_nullable
as String?,taskType: null == taskType ? _self.taskType : taskType // ignore: cast_nullable_to_non_nullable
as String,verificationType: null == verificationType ? _self.verificationType : verificationType // ignore: cast_nullable_to_non_nullable
as String,taskOrder: null == taskOrder ? _self.taskOrder : taskOrder // ignore: cast_nullable_to_non_nullable
as int,rewardAmount: freezed == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String?,required: null == required ? _self.required : required // ignore: cast_nullable_to_non_nullable
as bool,minimumTimeSeconds: null == minimumTimeSeconds ? _self.minimumTimeSeconds : minimumTimeSeconds // ignore: cast_nullable_to_non_nullable
as int,proofRequired: null == proofRequired ? _self.proofRequired : proofRequired // ignore: cast_nullable_to_non_nullable
as bool,proofType: freezed == proofType ? _self.proofType : proofType // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on

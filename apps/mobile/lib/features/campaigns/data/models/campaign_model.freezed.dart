// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'campaign_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CampaignModel {

 String get id; String get title; String get slug; String? get shortDescription; String get description; String? get thumbnailUrl; String? get bannerUrl; String get campaignType; String get status; String get rewardType; String get rewardAmount; int? get maxParticipants; int get currentParticipants; DateTime? get startAt; DateTime? get endAt; bool get featured;
/// Create a copy of CampaignModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CampaignModelCopyWith<CampaignModel> get copyWith => _$CampaignModelCopyWithImpl<CampaignModel>(this as CampaignModel, _$identity);

  /// Serializes this CampaignModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CampaignModel&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.shortDescription, shortDescription) || other.shortDescription == shortDescription)&&(identical(other.description, description) || other.description == description)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.bannerUrl, bannerUrl) || other.bannerUrl == bannerUrl)&&(identical(other.campaignType, campaignType) || other.campaignType == campaignType)&&(identical(other.status, status) || other.status == status)&&(identical(other.rewardType, rewardType) || other.rewardType == rewardType)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.maxParticipants, maxParticipants) || other.maxParticipants == maxParticipants)&&(identical(other.currentParticipants, currentParticipants) || other.currentParticipants == currentParticipants)&&(identical(other.startAt, startAt) || other.startAt == startAt)&&(identical(other.endAt, endAt) || other.endAt == endAt)&&(identical(other.featured, featured) || other.featured == featured));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,slug,shortDescription,description,thumbnailUrl,bannerUrl,campaignType,status,rewardType,rewardAmount,maxParticipants,currentParticipants,startAt,endAt,featured);

@override
String toString() {
  return 'CampaignModel(id: $id, title: $title, slug: $slug, shortDescription: $shortDescription, description: $description, thumbnailUrl: $thumbnailUrl, bannerUrl: $bannerUrl, campaignType: $campaignType, status: $status, rewardType: $rewardType, rewardAmount: $rewardAmount, maxParticipants: $maxParticipants, currentParticipants: $currentParticipants, startAt: $startAt, endAt: $endAt, featured: $featured)';
}


}

/// @nodoc
abstract mixin class $CampaignModelCopyWith<$Res>  {
  factory $CampaignModelCopyWith(CampaignModel value, $Res Function(CampaignModel) _then) = _$CampaignModelCopyWithImpl;
@useResult
$Res call({
 String id, String title, String slug, String? shortDescription, String description, String? thumbnailUrl, String? bannerUrl, String campaignType, String status, String rewardType, String rewardAmount, int? maxParticipants, int currentParticipants, DateTime? startAt, DateTime? endAt, bool featured
});




}
/// @nodoc
class _$CampaignModelCopyWithImpl<$Res>
    implements $CampaignModelCopyWith<$Res> {
  _$CampaignModelCopyWithImpl(this._self, this._then);

  final CampaignModel _self;
  final $Res Function(CampaignModel) _then;

/// Create a copy of CampaignModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? slug = null,Object? shortDescription = freezed,Object? description = null,Object? thumbnailUrl = freezed,Object? bannerUrl = freezed,Object? campaignType = null,Object? status = null,Object? rewardType = null,Object? rewardAmount = null,Object? maxParticipants = freezed,Object? currentParticipants = null,Object? startAt = freezed,Object? endAt = freezed,Object? featured = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,shortDescription: freezed == shortDescription ? _self.shortDescription : shortDescription // ignore: cast_nullable_to_non_nullable
as String?,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: freezed == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String?,bannerUrl: freezed == bannerUrl ? _self.bannerUrl : bannerUrl // ignore: cast_nullable_to_non_nullable
as String?,campaignType: null == campaignType ? _self.campaignType : campaignType // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,rewardType: null == rewardType ? _self.rewardType : rewardType // ignore: cast_nullable_to_non_nullable
as String,rewardAmount: null == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String,maxParticipants: freezed == maxParticipants ? _self.maxParticipants : maxParticipants // ignore: cast_nullable_to_non_nullable
as int?,currentParticipants: null == currentParticipants ? _self.currentParticipants : currentParticipants // ignore: cast_nullable_to_non_nullable
as int,startAt: freezed == startAt ? _self.startAt : startAt // ignore: cast_nullable_to_non_nullable
as DateTime?,endAt: freezed == endAt ? _self.endAt : endAt // ignore: cast_nullable_to_non_nullable
as DateTime?,featured: null == featured ? _self.featured : featured // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [CampaignModel].
extension CampaignModelPatterns on CampaignModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CampaignModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CampaignModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CampaignModel value)  $default,){
final _that = this;
switch (_that) {
case _CampaignModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CampaignModel value)?  $default,){
final _that = this;
switch (_that) {
case _CampaignModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String slug,  String? shortDescription,  String description,  String? thumbnailUrl,  String? bannerUrl,  String campaignType,  String status,  String rewardType,  String rewardAmount,  int? maxParticipants,  int currentParticipants,  DateTime? startAt,  DateTime? endAt,  bool featured)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CampaignModel() when $default != null:
return $default(_that.id,_that.title,_that.slug,_that.shortDescription,_that.description,_that.thumbnailUrl,_that.bannerUrl,_that.campaignType,_that.status,_that.rewardType,_that.rewardAmount,_that.maxParticipants,_that.currentParticipants,_that.startAt,_that.endAt,_that.featured);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String slug,  String? shortDescription,  String description,  String? thumbnailUrl,  String? bannerUrl,  String campaignType,  String status,  String rewardType,  String rewardAmount,  int? maxParticipants,  int currentParticipants,  DateTime? startAt,  DateTime? endAt,  bool featured)  $default,) {final _that = this;
switch (_that) {
case _CampaignModel():
return $default(_that.id,_that.title,_that.slug,_that.shortDescription,_that.description,_that.thumbnailUrl,_that.bannerUrl,_that.campaignType,_that.status,_that.rewardType,_that.rewardAmount,_that.maxParticipants,_that.currentParticipants,_that.startAt,_that.endAt,_that.featured);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String slug,  String? shortDescription,  String description,  String? thumbnailUrl,  String? bannerUrl,  String campaignType,  String status,  String rewardType,  String rewardAmount,  int? maxParticipants,  int currentParticipants,  DateTime? startAt,  DateTime? endAt,  bool featured)?  $default,) {final _that = this;
switch (_that) {
case _CampaignModel() when $default != null:
return $default(_that.id,_that.title,_that.slug,_that.shortDescription,_that.description,_that.thumbnailUrl,_that.bannerUrl,_that.campaignType,_that.status,_that.rewardType,_that.rewardAmount,_that.maxParticipants,_that.currentParticipants,_that.startAt,_that.endAt,_that.featured);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CampaignModel implements CampaignModel {
  const _CampaignModel({required this.id, required this.title, required this.slug, this.shortDescription, required this.description, this.thumbnailUrl, this.bannerUrl, required this.campaignType, required this.status, required this.rewardType, required this.rewardAmount, this.maxParticipants, this.currentParticipants = 0, this.startAt, this.endAt, this.featured = false});
  factory _CampaignModel.fromJson(Map<String, dynamic> json) => _$CampaignModelFromJson(json);

@override final  String id;
@override final  String title;
@override final  String slug;
@override final  String? shortDescription;
@override final  String description;
@override final  String? thumbnailUrl;
@override final  String? bannerUrl;
@override final  String campaignType;
@override final  String status;
@override final  String rewardType;
@override final  String rewardAmount;
@override final  int? maxParticipants;
@override@JsonKey() final  int currentParticipants;
@override final  DateTime? startAt;
@override final  DateTime? endAt;
@override@JsonKey() final  bool featured;

/// Create a copy of CampaignModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CampaignModelCopyWith<_CampaignModel> get copyWith => __$CampaignModelCopyWithImpl<_CampaignModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CampaignModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CampaignModel&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.shortDescription, shortDescription) || other.shortDescription == shortDescription)&&(identical(other.description, description) || other.description == description)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.bannerUrl, bannerUrl) || other.bannerUrl == bannerUrl)&&(identical(other.campaignType, campaignType) || other.campaignType == campaignType)&&(identical(other.status, status) || other.status == status)&&(identical(other.rewardType, rewardType) || other.rewardType == rewardType)&&(identical(other.rewardAmount, rewardAmount) || other.rewardAmount == rewardAmount)&&(identical(other.maxParticipants, maxParticipants) || other.maxParticipants == maxParticipants)&&(identical(other.currentParticipants, currentParticipants) || other.currentParticipants == currentParticipants)&&(identical(other.startAt, startAt) || other.startAt == startAt)&&(identical(other.endAt, endAt) || other.endAt == endAt)&&(identical(other.featured, featured) || other.featured == featured));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,slug,shortDescription,description,thumbnailUrl,bannerUrl,campaignType,status,rewardType,rewardAmount,maxParticipants,currentParticipants,startAt,endAt,featured);

@override
String toString() {
  return 'CampaignModel(id: $id, title: $title, slug: $slug, shortDescription: $shortDescription, description: $description, thumbnailUrl: $thumbnailUrl, bannerUrl: $bannerUrl, campaignType: $campaignType, status: $status, rewardType: $rewardType, rewardAmount: $rewardAmount, maxParticipants: $maxParticipants, currentParticipants: $currentParticipants, startAt: $startAt, endAt: $endAt, featured: $featured)';
}


}

/// @nodoc
abstract mixin class _$CampaignModelCopyWith<$Res> implements $CampaignModelCopyWith<$Res> {
  factory _$CampaignModelCopyWith(_CampaignModel value, $Res Function(_CampaignModel) _then) = __$CampaignModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String slug, String? shortDescription, String description, String? thumbnailUrl, String? bannerUrl, String campaignType, String status, String rewardType, String rewardAmount, int? maxParticipants, int currentParticipants, DateTime? startAt, DateTime? endAt, bool featured
});




}
/// @nodoc
class __$CampaignModelCopyWithImpl<$Res>
    implements _$CampaignModelCopyWith<$Res> {
  __$CampaignModelCopyWithImpl(this._self, this._then);

  final _CampaignModel _self;
  final $Res Function(_CampaignModel) _then;

/// Create a copy of CampaignModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? slug = null,Object? shortDescription = freezed,Object? description = null,Object? thumbnailUrl = freezed,Object? bannerUrl = freezed,Object? campaignType = null,Object? status = null,Object? rewardType = null,Object? rewardAmount = null,Object? maxParticipants = freezed,Object? currentParticipants = null,Object? startAt = freezed,Object? endAt = freezed,Object? featured = null,}) {
  return _then(_CampaignModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,shortDescription: freezed == shortDescription ? _self.shortDescription : shortDescription // ignore: cast_nullable_to_non_nullable
as String?,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: freezed == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String?,bannerUrl: freezed == bannerUrl ? _self.bannerUrl : bannerUrl // ignore: cast_nullable_to_non_nullable
as String?,campaignType: null == campaignType ? _self.campaignType : campaignType // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,rewardType: null == rewardType ? _self.rewardType : rewardType // ignore: cast_nullable_to_non_nullable
as String,rewardAmount: null == rewardAmount ? _self.rewardAmount : rewardAmount // ignore: cast_nullable_to_non_nullable
as String,maxParticipants: freezed == maxParticipants ? _self.maxParticipants : maxParticipants // ignore: cast_nullable_to_non_nullable
as int?,currentParticipants: null == currentParticipants ? _self.currentParticipants : currentParticipants // ignore: cast_nullable_to_non_nullable
as int,startAt: freezed == startAt ? _self.startAt : startAt // ignore: cast_nullable_to_non_nullable
as DateTime?,endAt: freezed == endAt ? _self.endAt : endAt // ignore: cast_nullable_to_non_nullable
as DateTime?,featured: null == featured ? _self.featured : featured // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on

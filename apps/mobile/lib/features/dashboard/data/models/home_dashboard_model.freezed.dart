// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'home_dashboard_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$HomeDashboardModel {

 WalletSummaryModel get wallet; List<CampaignModel> get featuredCampaigns; List<CampaignModel> get popularCampaigns; List<RecommendedTaskModel> get recommendedTasks;
/// Create a copy of HomeDashboardModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HomeDashboardModelCopyWith<HomeDashboardModel> get copyWith => _$HomeDashboardModelCopyWithImpl<HomeDashboardModel>(this as HomeDashboardModel, _$identity);

  /// Serializes this HomeDashboardModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HomeDashboardModel&&(identical(other.wallet, wallet) || other.wallet == wallet)&&const DeepCollectionEquality().equals(other.featuredCampaigns, featuredCampaigns)&&const DeepCollectionEquality().equals(other.popularCampaigns, popularCampaigns)&&const DeepCollectionEquality().equals(other.recommendedTasks, recommendedTasks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,wallet,const DeepCollectionEquality().hash(featuredCampaigns),const DeepCollectionEquality().hash(popularCampaigns),const DeepCollectionEquality().hash(recommendedTasks));

@override
String toString() {
  return 'HomeDashboardModel(wallet: $wallet, featuredCampaigns: $featuredCampaigns, popularCampaigns: $popularCampaigns, recommendedTasks: $recommendedTasks)';
}


}

/// @nodoc
abstract mixin class $HomeDashboardModelCopyWith<$Res>  {
  factory $HomeDashboardModelCopyWith(HomeDashboardModel value, $Res Function(HomeDashboardModel) _then) = _$HomeDashboardModelCopyWithImpl;
@useResult
$Res call({
 WalletSummaryModel wallet, List<CampaignModel> featuredCampaigns, List<CampaignModel> popularCampaigns, List<RecommendedTaskModel> recommendedTasks
});


$WalletSummaryModelCopyWith<$Res> get wallet;

}
/// @nodoc
class _$HomeDashboardModelCopyWithImpl<$Res>
    implements $HomeDashboardModelCopyWith<$Res> {
  _$HomeDashboardModelCopyWithImpl(this._self, this._then);

  final HomeDashboardModel _self;
  final $Res Function(HomeDashboardModel) _then;

/// Create a copy of HomeDashboardModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? wallet = null,Object? featuredCampaigns = null,Object? popularCampaigns = null,Object? recommendedTasks = null,}) {
  return _then(_self.copyWith(
wallet: null == wallet ? _self.wallet : wallet // ignore: cast_nullable_to_non_nullable
as WalletSummaryModel,featuredCampaigns: null == featuredCampaigns ? _self.featuredCampaigns : featuredCampaigns // ignore: cast_nullable_to_non_nullable
as List<CampaignModel>,popularCampaigns: null == popularCampaigns ? _self.popularCampaigns : popularCampaigns // ignore: cast_nullable_to_non_nullable
as List<CampaignModel>,recommendedTasks: null == recommendedTasks ? _self.recommendedTasks : recommendedTasks // ignore: cast_nullable_to_non_nullable
as List<RecommendedTaskModel>,
  ));
}
/// Create a copy of HomeDashboardModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$WalletSummaryModelCopyWith<$Res> get wallet {
  
  return $WalletSummaryModelCopyWith<$Res>(_self.wallet, (value) {
    return _then(_self.copyWith(wallet: value));
  });
}
}


/// Adds pattern-matching-related methods to [HomeDashboardModel].
extension HomeDashboardModelPatterns on HomeDashboardModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HomeDashboardModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HomeDashboardModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HomeDashboardModel value)  $default,){
final _that = this;
switch (_that) {
case _HomeDashboardModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HomeDashboardModel value)?  $default,){
final _that = this;
switch (_that) {
case _HomeDashboardModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( WalletSummaryModel wallet,  List<CampaignModel> featuredCampaigns,  List<CampaignModel> popularCampaigns,  List<RecommendedTaskModel> recommendedTasks)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HomeDashboardModel() when $default != null:
return $default(_that.wallet,_that.featuredCampaigns,_that.popularCampaigns,_that.recommendedTasks);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( WalletSummaryModel wallet,  List<CampaignModel> featuredCampaigns,  List<CampaignModel> popularCampaigns,  List<RecommendedTaskModel> recommendedTasks)  $default,) {final _that = this;
switch (_that) {
case _HomeDashboardModel():
return $default(_that.wallet,_that.featuredCampaigns,_that.popularCampaigns,_that.recommendedTasks);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( WalletSummaryModel wallet,  List<CampaignModel> featuredCampaigns,  List<CampaignModel> popularCampaigns,  List<RecommendedTaskModel> recommendedTasks)?  $default,) {final _that = this;
switch (_that) {
case _HomeDashboardModel() when $default != null:
return $default(_that.wallet,_that.featuredCampaigns,_that.popularCampaigns,_that.recommendedTasks);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HomeDashboardModel implements HomeDashboardModel {
  const _HomeDashboardModel({required this.wallet, required final  List<CampaignModel> featuredCampaigns, required final  List<CampaignModel> popularCampaigns, required final  List<RecommendedTaskModel> recommendedTasks}): _featuredCampaigns = featuredCampaigns,_popularCampaigns = popularCampaigns,_recommendedTasks = recommendedTasks;
  factory _HomeDashboardModel.fromJson(Map<String, dynamic> json) => _$HomeDashboardModelFromJson(json);

@override final  WalletSummaryModel wallet;
 final  List<CampaignModel> _featuredCampaigns;
@override List<CampaignModel> get featuredCampaigns {
  if (_featuredCampaigns is EqualUnmodifiableListView) return _featuredCampaigns;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_featuredCampaigns);
}

 final  List<CampaignModel> _popularCampaigns;
@override List<CampaignModel> get popularCampaigns {
  if (_popularCampaigns is EqualUnmodifiableListView) return _popularCampaigns;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_popularCampaigns);
}

 final  List<RecommendedTaskModel> _recommendedTasks;
@override List<RecommendedTaskModel> get recommendedTasks {
  if (_recommendedTasks is EqualUnmodifiableListView) return _recommendedTasks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_recommendedTasks);
}


/// Create a copy of HomeDashboardModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HomeDashboardModelCopyWith<_HomeDashboardModel> get copyWith => __$HomeDashboardModelCopyWithImpl<_HomeDashboardModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HomeDashboardModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _HomeDashboardModel&&(identical(other.wallet, wallet) || other.wallet == wallet)&&const DeepCollectionEquality().equals(other._featuredCampaigns, _featuredCampaigns)&&const DeepCollectionEquality().equals(other._popularCampaigns, _popularCampaigns)&&const DeepCollectionEquality().equals(other._recommendedTasks, _recommendedTasks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,wallet,const DeepCollectionEquality().hash(_featuredCampaigns),const DeepCollectionEquality().hash(_popularCampaigns),const DeepCollectionEquality().hash(_recommendedTasks));

@override
String toString() {
  return 'HomeDashboardModel(wallet: $wallet, featuredCampaigns: $featuredCampaigns, popularCampaigns: $popularCampaigns, recommendedTasks: $recommendedTasks)';
}


}

/// @nodoc
abstract mixin class _$HomeDashboardModelCopyWith<$Res> implements $HomeDashboardModelCopyWith<$Res> {
  factory _$HomeDashboardModelCopyWith(_HomeDashboardModel value, $Res Function(_HomeDashboardModel) _then) = __$HomeDashboardModelCopyWithImpl;
@override @useResult
$Res call({
 WalletSummaryModel wallet, List<CampaignModel> featuredCampaigns, List<CampaignModel> popularCampaigns, List<RecommendedTaskModel> recommendedTasks
});


@override $WalletSummaryModelCopyWith<$Res> get wallet;

}
/// @nodoc
class __$HomeDashboardModelCopyWithImpl<$Res>
    implements _$HomeDashboardModelCopyWith<$Res> {
  __$HomeDashboardModelCopyWithImpl(this._self, this._then);

  final _HomeDashboardModel _self;
  final $Res Function(_HomeDashboardModel) _then;

/// Create a copy of HomeDashboardModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? wallet = null,Object? featuredCampaigns = null,Object? popularCampaigns = null,Object? recommendedTasks = null,}) {
  return _then(_HomeDashboardModel(
wallet: null == wallet ? _self.wallet : wallet // ignore: cast_nullable_to_non_nullable
as WalletSummaryModel,featuredCampaigns: null == featuredCampaigns ? _self._featuredCampaigns : featuredCampaigns // ignore: cast_nullable_to_non_nullable
as List<CampaignModel>,popularCampaigns: null == popularCampaigns ? _self._popularCampaigns : popularCampaigns // ignore: cast_nullable_to_non_nullable
as List<CampaignModel>,recommendedTasks: null == recommendedTasks ? _self._recommendedTasks : recommendedTasks // ignore: cast_nullable_to_non_nullable
as List<RecommendedTaskModel>,
  ));
}

/// Create a copy of HomeDashboardModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$WalletSummaryModelCopyWith<$Res> get wallet {
  
  return $WalletSummaryModelCopyWith<$Res>(_self.wallet, (value) {
    return _then(_self.copyWith(wallet: value));
  });
}
}

// dart format on

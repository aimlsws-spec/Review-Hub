// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'daily_reward_result_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$DailyRewardResultModel {

 DailyRewardPrizeSummary get prize;
/// Create a copy of DailyRewardResultModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyRewardResultModelCopyWith<DailyRewardResultModel> get copyWith => _$DailyRewardResultModelCopyWithImpl<DailyRewardResultModel>(this as DailyRewardResultModel, _$identity);

  /// Serializes this DailyRewardResultModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyRewardResultModel&&(identical(other.prize, prize) || other.prize == prize));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,prize);

@override
String toString() {
  return 'DailyRewardResultModel(prize: $prize)';
}


}

/// @nodoc
abstract mixin class $DailyRewardResultModelCopyWith<$Res>  {
  factory $DailyRewardResultModelCopyWith(DailyRewardResultModel value, $Res Function(DailyRewardResultModel) _then) = _$DailyRewardResultModelCopyWithImpl;
@useResult
$Res call({
 DailyRewardPrizeSummary prize
});


$DailyRewardPrizeSummaryCopyWith<$Res> get prize;

}
/// @nodoc
class _$DailyRewardResultModelCopyWithImpl<$Res>
    implements $DailyRewardResultModelCopyWith<$Res> {
  _$DailyRewardResultModelCopyWithImpl(this._self, this._then);

  final DailyRewardResultModel _self;
  final $Res Function(DailyRewardResultModel) _then;

/// Create a copy of DailyRewardResultModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? prize = null,}) {
  return _then(_self.copyWith(
prize: null == prize ? _self.prize : prize // ignore: cast_nullable_to_non_nullable
as DailyRewardPrizeSummary,
  ));
}
/// Create a copy of DailyRewardResultModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DailyRewardPrizeSummaryCopyWith<$Res> get prize {
  
  return $DailyRewardPrizeSummaryCopyWith<$Res>(_self.prize, (value) {
    return _then(_self.copyWith(prize: value));
  });
}
}


/// Adds pattern-matching-related methods to [DailyRewardResultModel].
extension DailyRewardResultModelPatterns on DailyRewardResultModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyRewardResultModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyRewardResultModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyRewardResultModel value)  $default,){
final _that = this;
switch (_that) {
case _DailyRewardResultModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyRewardResultModel value)?  $default,){
final _that = this;
switch (_that) {
case _DailyRewardResultModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( DailyRewardPrizeSummary prize)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyRewardResultModel() when $default != null:
return $default(_that.prize);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( DailyRewardPrizeSummary prize)  $default,) {final _that = this;
switch (_that) {
case _DailyRewardResultModel():
return $default(_that.prize);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( DailyRewardPrizeSummary prize)?  $default,) {final _that = this;
switch (_that) {
case _DailyRewardResultModel() when $default != null:
return $default(_that.prize);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyRewardResultModel implements DailyRewardResultModel {
  const _DailyRewardResultModel({required this.prize});
  factory _DailyRewardResultModel.fromJson(Map<String, dynamic> json) => _$DailyRewardResultModelFromJson(json);

@override final  DailyRewardPrizeSummary prize;

/// Create a copy of DailyRewardResultModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyRewardResultModelCopyWith<_DailyRewardResultModel> get copyWith => __$DailyRewardResultModelCopyWithImpl<_DailyRewardResultModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyRewardResultModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyRewardResultModel&&(identical(other.prize, prize) || other.prize == prize));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,prize);

@override
String toString() {
  return 'DailyRewardResultModel(prize: $prize)';
}


}

/// @nodoc
abstract mixin class _$DailyRewardResultModelCopyWith<$Res> implements $DailyRewardResultModelCopyWith<$Res> {
  factory _$DailyRewardResultModelCopyWith(_DailyRewardResultModel value, $Res Function(_DailyRewardResultModel) _then) = __$DailyRewardResultModelCopyWithImpl;
@override @useResult
$Res call({
 DailyRewardPrizeSummary prize
});


@override $DailyRewardPrizeSummaryCopyWith<$Res> get prize;

}
/// @nodoc
class __$DailyRewardResultModelCopyWithImpl<$Res>
    implements _$DailyRewardResultModelCopyWith<$Res> {
  __$DailyRewardResultModelCopyWithImpl(this._self, this._then);

  final _DailyRewardResultModel _self;
  final $Res Function(_DailyRewardResultModel) _then;

/// Create a copy of DailyRewardResultModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? prize = null,}) {
  return _then(_DailyRewardResultModel(
prize: null == prize ? _self.prize : prize // ignore: cast_nullable_to_non_nullable
as DailyRewardPrizeSummary,
  ));
}

/// Create a copy of DailyRewardResultModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DailyRewardPrizeSummaryCopyWith<$Res> get prize {
  
  return $DailyRewardPrizeSummaryCopyWith<$Res>(_self.prize, (value) {
    return _then(_self.copyWith(prize: value));
  });
}
}


/// @nodoc
mixin _$DailyRewardPrizeSummary {

 String get id; String get label; double get amount;
/// Create a copy of DailyRewardPrizeSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyRewardPrizeSummaryCopyWith<DailyRewardPrizeSummary> get copyWith => _$DailyRewardPrizeSummaryCopyWithImpl<DailyRewardPrizeSummary>(this as DailyRewardPrizeSummary, _$identity);

  /// Serializes this DailyRewardPrizeSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyRewardPrizeSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.amount, amount) || other.amount == amount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,amount);

@override
String toString() {
  return 'DailyRewardPrizeSummary(id: $id, label: $label, amount: $amount)';
}


}

/// @nodoc
abstract mixin class $DailyRewardPrizeSummaryCopyWith<$Res>  {
  factory $DailyRewardPrizeSummaryCopyWith(DailyRewardPrizeSummary value, $Res Function(DailyRewardPrizeSummary) _then) = _$DailyRewardPrizeSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String label, double amount
});




}
/// @nodoc
class _$DailyRewardPrizeSummaryCopyWithImpl<$Res>
    implements $DailyRewardPrizeSummaryCopyWith<$Res> {
  _$DailyRewardPrizeSummaryCopyWithImpl(this._self, this._then);

  final DailyRewardPrizeSummary _self;
  final $Res Function(DailyRewardPrizeSummary) _then;

/// Create a copy of DailyRewardPrizeSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? label = null,Object? amount = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [DailyRewardPrizeSummary].
extension DailyRewardPrizeSummaryPatterns on DailyRewardPrizeSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyRewardPrizeSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyRewardPrizeSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyRewardPrizeSummary value)  $default,){
final _that = this;
switch (_that) {
case _DailyRewardPrizeSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyRewardPrizeSummary value)?  $default,){
final _that = this;
switch (_that) {
case _DailyRewardPrizeSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String label,  double amount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyRewardPrizeSummary() when $default != null:
return $default(_that.id,_that.label,_that.amount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String label,  double amount)  $default,) {final _that = this;
switch (_that) {
case _DailyRewardPrizeSummary():
return $default(_that.id,_that.label,_that.amount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String label,  double amount)?  $default,) {final _that = this;
switch (_that) {
case _DailyRewardPrizeSummary() when $default != null:
return $default(_that.id,_that.label,_that.amount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyRewardPrizeSummary implements DailyRewardPrizeSummary {
  const _DailyRewardPrizeSummary({required this.id, required this.label, required this.amount});
  factory _DailyRewardPrizeSummary.fromJson(Map<String, dynamic> json) => _$DailyRewardPrizeSummaryFromJson(json);

@override final  String id;
@override final  String label;
@override final  double amount;

/// Create a copy of DailyRewardPrizeSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyRewardPrizeSummaryCopyWith<_DailyRewardPrizeSummary> get copyWith => __$DailyRewardPrizeSummaryCopyWithImpl<_DailyRewardPrizeSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyRewardPrizeSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyRewardPrizeSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.amount, amount) || other.amount == amount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,amount);

@override
String toString() {
  return 'DailyRewardPrizeSummary(id: $id, label: $label, amount: $amount)';
}


}

/// @nodoc
abstract mixin class _$DailyRewardPrizeSummaryCopyWith<$Res> implements $DailyRewardPrizeSummaryCopyWith<$Res> {
  factory _$DailyRewardPrizeSummaryCopyWith(_DailyRewardPrizeSummary value, $Res Function(_DailyRewardPrizeSummary) _then) = __$DailyRewardPrizeSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String label, double amount
});




}
/// @nodoc
class __$DailyRewardPrizeSummaryCopyWithImpl<$Res>
    implements _$DailyRewardPrizeSummaryCopyWith<$Res> {
  __$DailyRewardPrizeSummaryCopyWithImpl(this._self, this._then);

  final _DailyRewardPrizeSummary _self;
  final $Res Function(_DailyRewardPrizeSummary) _then;

/// Create a copy of DailyRewardPrizeSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? label = null,Object? amount = null,}) {
  return _then(_DailyRewardPrizeSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}

// dart format on

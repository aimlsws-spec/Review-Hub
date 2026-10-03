// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'earnings_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EarningsBreakdownModel {

@JsonKey(fromJson: _toDouble) double get tasks;@JsonKey(fromJson: _toDouble) double get bonus;@JsonKey(fromJson: _toDouble) double get referral;@JsonKey(fromJson: _toDouble) double get total;
/// Create a copy of EarningsBreakdownModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EarningsBreakdownModelCopyWith<EarningsBreakdownModel> get copyWith => _$EarningsBreakdownModelCopyWithImpl<EarningsBreakdownModel>(this as EarningsBreakdownModel, _$identity);

  /// Serializes this EarningsBreakdownModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EarningsBreakdownModel&&(identical(other.tasks, tasks) || other.tasks == tasks)&&(identical(other.bonus, bonus) || other.bonus == bonus)&&(identical(other.referral, referral) || other.referral == referral)&&(identical(other.total, total) || other.total == total));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,tasks,bonus,referral,total);

@override
String toString() {
  return 'EarningsBreakdownModel(tasks: $tasks, bonus: $bonus, referral: $referral, total: $total)';
}


}

/// @nodoc
abstract mixin class $EarningsBreakdownModelCopyWith<$Res>  {
  factory $EarningsBreakdownModelCopyWith(EarningsBreakdownModel value, $Res Function(EarningsBreakdownModel) _then) = _$EarningsBreakdownModelCopyWithImpl;
@useResult
$Res call({
@JsonKey(fromJson: _toDouble) double tasks,@JsonKey(fromJson: _toDouble) double bonus,@JsonKey(fromJson: _toDouble) double referral,@JsonKey(fromJson: _toDouble) double total
});




}
/// @nodoc
class _$EarningsBreakdownModelCopyWithImpl<$Res>
    implements $EarningsBreakdownModelCopyWith<$Res> {
  _$EarningsBreakdownModelCopyWithImpl(this._self, this._then);

  final EarningsBreakdownModel _self;
  final $Res Function(EarningsBreakdownModel) _then;

/// Create a copy of EarningsBreakdownModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? tasks = null,Object? bonus = null,Object? referral = null,Object? total = null,}) {
  return _then(_self.copyWith(
tasks: null == tasks ? _self.tasks : tasks // ignore: cast_nullable_to_non_nullable
as double,bonus: null == bonus ? _self.bonus : bonus // ignore: cast_nullable_to_non_nullable
as double,referral: null == referral ? _self.referral : referral // ignore: cast_nullable_to_non_nullable
as double,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [EarningsBreakdownModel].
extension EarningsBreakdownModelPatterns on EarningsBreakdownModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EarningsBreakdownModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EarningsBreakdownModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EarningsBreakdownModel value)  $default,){
final _that = this;
switch (_that) {
case _EarningsBreakdownModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EarningsBreakdownModel value)?  $default,){
final _that = this;
switch (_that) {
case _EarningsBreakdownModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(fromJson: _toDouble)  double tasks, @JsonKey(fromJson: _toDouble)  double bonus, @JsonKey(fromJson: _toDouble)  double referral, @JsonKey(fromJson: _toDouble)  double total)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EarningsBreakdownModel() when $default != null:
return $default(_that.tasks,_that.bonus,_that.referral,_that.total);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(fromJson: _toDouble)  double tasks, @JsonKey(fromJson: _toDouble)  double bonus, @JsonKey(fromJson: _toDouble)  double referral, @JsonKey(fromJson: _toDouble)  double total)  $default,) {final _that = this;
switch (_that) {
case _EarningsBreakdownModel():
return $default(_that.tasks,_that.bonus,_that.referral,_that.total);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(fromJson: _toDouble)  double tasks, @JsonKey(fromJson: _toDouble)  double bonus, @JsonKey(fromJson: _toDouble)  double referral, @JsonKey(fromJson: _toDouble)  double total)?  $default,) {final _that = this;
switch (_that) {
case _EarningsBreakdownModel() when $default != null:
return $default(_that.tasks,_that.bonus,_that.referral,_that.total);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EarningsBreakdownModel implements EarningsBreakdownModel {
  const _EarningsBreakdownModel({@JsonKey(fromJson: _toDouble) this.tasks = 0, @JsonKey(fromJson: _toDouble) this.bonus = 0, @JsonKey(fromJson: _toDouble) this.referral = 0, @JsonKey(fromJson: _toDouble) this.total = 0});
  factory _EarningsBreakdownModel.fromJson(Map<String, dynamic> json) => _$EarningsBreakdownModelFromJson(json);

@override@JsonKey(fromJson: _toDouble) final  double tasks;
@override@JsonKey(fromJson: _toDouble) final  double bonus;
@override@JsonKey(fromJson: _toDouble) final  double referral;
@override@JsonKey(fromJson: _toDouble) final  double total;

/// Create a copy of EarningsBreakdownModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EarningsBreakdownModelCopyWith<_EarningsBreakdownModel> get copyWith => __$EarningsBreakdownModelCopyWithImpl<_EarningsBreakdownModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EarningsBreakdownModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EarningsBreakdownModel&&(identical(other.tasks, tasks) || other.tasks == tasks)&&(identical(other.bonus, bonus) || other.bonus == bonus)&&(identical(other.referral, referral) || other.referral == referral)&&(identical(other.total, total) || other.total == total));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,tasks,bonus,referral,total);

@override
String toString() {
  return 'EarningsBreakdownModel(tasks: $tasks, bonus: $bonus, referral: $referral, total: $total)';
}


}

/// @nodoc
abstract mixin class _$EarningsBreakdownModelCopyWith<$Res> implements $EarningsBreakdownModelCopyWith<$Res> {
  factory _$EarningsBreakdownModelCopyWith(_EarningsBreakdownModel value, $Res Function(_EarningsBreakdownModel) _then) = __$EarningsBreakdownModelCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(fromJson: _toDouble) double tasks,@JsonKey(fromJson: _toDouble) double bonus,@JsonKey(fromJson: _toDouble) double referral,@JsonKey(fromJson: _toDouble) double total
});




}
/// @nodoc
class __$EarningsBreakdownModelCopyWithImpl<$Res>
    implements _$EarningsBreakdownModelCopyWith<$Res> {
  __$EarningsBreakdownModelCopyWithImpl(this._self, this._then);

  final _EarningsBreakdownModel _self;
  final $Res Function(_EarningsBreakdownModel) _then;

/// Create a copy of EarningsBreakdownModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? tasks = null,Object? bonus = null,Object? referral = null,Object? total = null,}) {
  return _then(_EarningsBreakdownModel(
tasks: null == tasks ? _self.tasks : tasks // ignore: cast_nullable_to_non_nullable
as double,bonus: null == bonus ? _self.bonus : bonus // ignore: cast_nullable_to_non_nullable
as double,referral: null == referral ? _self.referral : referral // ignore: cast_nullable_to_non_nullable
as double,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$EarningsPointModel {

 String get key;@JsonKey(fromJson: _toDouble) double get amount;
/// Create a copy of EarningsPointModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EarningsPointModelCopyWith<EarningsPointModel> get copyWith => _$EarningsPointModelCopyWithImpl<EarningsPointModel>(this as EarningsPointModel, _$identity);

  /// Serializes this EarningsPointModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EarningsPointModel&&(identical(other.key, key) || other.key == key)&&(identical(other.amount, amount) || other.amount == amount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,amount);

@override
String toString() {
  return 'EarningsPointModel(key: $key, amount: $amount)';
}


}

/// @nodoc
abstract mixin class $EarningsPointModelCopyWith<$Res>  {
  factory $EarningsPointModelCopyWith(EarningsPointModel value, $Res Function(EarningsPointModel) _then) = _$EarningsPointModelCopyWithImpl;
@useResult
$Res call({
 String key,@JsonKey(fromJson: _toDouble) double amount
});




}
/// @nodoc
class _$EarningsPointModelCopyWithImpl<$Res>
    implements $EarningsPointModelCopyWith<$Res> {
  _$EarningsPointModelCopyWithImpl(this._self, this._then);

  final EarningsPointModel _self;
  final $Res Function(EarningsPointModel) _then;

/// Create a copy of EarningsPointModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? key = null,Object? amount = null,}) {
  return _then(_self.copyWith(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [EarningsPointModel].
extension EarningsPointModelPatterns on EarningsPointModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EarningsPointModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EarningsPointModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EarningsPointModel value)  $default,){
final _that = this;
switch (_that) {
case _EarningsPointModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EarningsPointModel value)?  $default,){
final _that = this;
switch (_that) {
case _EarningsPointModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String key, @JsonKey(fromJson: _toDouble)  double amount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EarningsPointModel() when $default != null:
return $default(_that.key,_that.amount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String key, @JsonKey(fromJson: _toDouble)  double amount)  $default,) {final _that = this;
switch (_that) {
case _EarningsPointModel():
return $default(_that.key,_that.amount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String key, @JsonKey(fromJson: _toDouble)  double amount)?  $default,) {final _that = this;
switch (_that) {
case _EarningsPointModel() when $default != null:
return $default(_that.key,_that.amount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EarningsPointModel implements EarningsPointModel {
  const _EarningsPointModel({this.key = '', @JsonKey(fromJson: _toDouble) this.amount = 0});
  factory _EarningsPointModel.fromJson(Map<String, dynamic> json) => _$EarningsPointModelFromJson(json);

@override@JsonKey() final  String key;
@override@JsonKey(fromJson: _toDouble) final  double amount;

/// Create a copy of EarningsPointModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EarningsPointModelCopyWith<_EarningsPointModel> get copyWith => __$EarningsPointModelCopyWithImpl<_EarningsPointModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EarningsPointModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EarningsPointModel&&(identical(other.key, key) || other.key == key)&&(identical(other.amount, amount) || other.amount == amount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,amount);

@override
String toString() {
  return 'EarningsPointModel(key: $key, amount: $amount)';
}


}

/// @nodoc
abstract mixin class _$EarningsPointModelCopyWith<$Res> implements $EarningsPointModelCopyWith<$Res> {
  factory _$EarningsPointModelCopyWith(_EarningsPointModel value, $Res Function(_EarningsPointModel) _then) = __$EarningsPointModelCopyWithImpl;
@override @useResult
$Res call({
 String key,@JsonKey(fromJson: _toDouble) double amount
});




}
/// @nodoc
class __$EarningsPointModelCopyWithImpl<$Res>
    implements _$EarningsPointModelCopyWith<$Res> {
  __$EarningsPointModelCopyWithImpl(this._self, this._then);

  final _EarningsPointModel _self;
  final $Res Function(_EarningsPointModel) _then;

/// Create a copy of EarningsPointModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? key = null,Object? amount = null,}) {
  return _then(_EarningsPointModel(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$EarningsChartModel {

@JsonKey(unknownEnumValue: EarningsPeriod.week) EarningsPeriod get period; List<EarningsPointModel> get points;@JsonKey(fromJson: _toDouble) double get total;
/// Create a copy of EarningsChartModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EarningsChartModelCopyWith<EarningsChartModel> get copyWith => _$EarningsChartModelCopyWithImpl<EarningsChartModel>(this as EarningsChartModel, _$identity);

  /// Serializes this EarningsChartModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EarningsChartModel&&(identical(other.period, period) || other.period == period)&&const DeepCollectionEquality().equals(other.points, points)&&(identical(other.total, total) || other.total == total));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,period,const DeepCollectionEquality().hash(points),total);

@override
String toString() {
  return 'EarningsChartModel(period: $period, points: $points, total: $total)';
}


}

/// @nodoc
abstract mixin class $EarningsChartModelCopyWith<$Res>  {
  factory $EarningsChartModelCopyWith(EarningsChartModel value, $Res Function(EarningsChartModel) _then) = _$EarningsChartModelCopyWithImpl;
@useResult
$Res call({
@JsonKey(unknownEnumValue: EarningsPeriod.week) EarningsPeriod period, List<EarningsPointModel> points,@JsonKey(fromJson: _toDouble) double total
});




}
/// @nodoc
class _$EarningsChartModelCopyWithImpl<$Res>
    implements $EarningsChartModelCopyWith<$Res> {
  _$EarningsChartModelCopyWithImpl(this._self, this._then);

  final EarningsChartModel _self;
  final $Res Function(EarningsChartModel) _then;

/// Create a copy of EarningsChartModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? period = null,Object? points = null,Object? total = null,}) {
  return _then(_self.copyWith(
period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as EarningsPeriod,points: null == points ? _self.points : points // ignore: cast_nullable_to_non_nullable
as List<EarningsPointModel>,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [EarningsChartModel].
extension EarningsChartModelPatterns on EarningsChartModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EarningsChartModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EarningsChartModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EarningsChartModel value)  $default,){
final _that = this;
switch (_that) {
case _EarningsChartModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EarningsChartModel value)?  $default,){
final _that = this;
switch (_that) {
case _EarningsChartModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(unknownEnumValue: EarningsPeriod.week)  EarningsPeriod period,  List<EarningsPointModel> points, @JsonKey(fromJson: _toDouble)  double total)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EarningsChartModel() when $default != null:
return $default(_that.period,_that.points,_that.total);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(unknownEnumValue: EarningsPeriod.week)  EarningsPeriod period,  List<EarningsPointModel> points, @JsonKey(fromJson: _toDouble)  double total)  $default,) {final _that = this;
switch (_that) {
case _EarningsChartModel():
return $default(_that.period,_that.points,_that.total);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(unknownEnumValue: EarningsPeriod.week)  EarningsPeriod period,  List<EarningsPointModel> points, @JsonKey(fromJson: _toDouble)  double total)?  $default,) {final _that = this;
switch (_that) {
case _EarningsChartModel() when $default != null:
return $default(_that.period,_that.points,_that.total);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EarningsChartModel implements EarningsChartModel {
  const _EarningsChartModel({@JsonKey(unknownEnumValue: EarningsPeriod.week) this.period = EarningsPeriod.week, final  List<EarningsPointModel> points = const <EarningsPointModel>[], @JsonKey(fromJson: _toDouble) this.total = 0}): _points = points;
  factory _EarningsChartModel.fromJson(Map<String, dynamic> json) => _$EarningsChartModelFromJson(json);

@override@JsonKey(unknownEnumValue: EarningsPeriod.week) final  EarningsPeriod period;
 final  List<EarningsPointModel> _points;
@override@JsonKey() List<EarningsPointModel> get points {
  if (_points is EqualUnmodifiableListView) return _points;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_points);
}

@override@JsonKey(fromJson: _toDouble) final  double total;

/// Create a copy of EarningsChartModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EarningsChartModelCopyWith<_EarningsChartModel> get copyWith => __$EarningsChartModelCopyWithImpl<_EarningsChartModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EarningsChartModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EarningsChartModel&&(identical(other.period, period) || other.period == period)&&const DeepCollectionEquality().equals(other._points, _points)&&(identical(other.total, total) || other.total == total));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,period,const DeepCollectionEquality().hash(_points),total);

@override
String toString() {
  return 'EarningsChartModel(period: $period, points: $points, total: $total)';
}


}

/// @nodoc
abstract mixin class _$EarningsChartModelCopyWith<$Res> implements $EarningsChartModelCopyWith<$Res> {
  factory _$EarningsChartModelCopyWith(_EarningsChartModel value, $Res Function(_EarningsChartModel) _then) = __$EarningsChartModelCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(unknownEnumValue: EarningsPeriod.week) EarningsPeriod period, List<EarningsPointModel> points,@JsonKey(fromJson: _toDouble) double total
});




}
/// @nodoc
class __$EarningsChartModelCopyWithImpl<$Res>
    implements _$EarningsChartModelCopyWith<$Res> {
  __$EarningsChartModelCopyWithImpl(this._self, this._then);

  final _EarningsChartModel _self;
  final $Res Function(_EarningsChartModel) _then;

/// Create a copy of EarningsChartModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? period = null,Object? points = null,Object? total = null,}) {
  return _then(_EarningsChartModel(
period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as EarningsPeriod,points: null == points ? _self._points : points // ignore: cast_nullable_to_non_nullable
as List<EarningsPointModel>,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}

// dart format on

// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'bank_account_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$BankAccountModel {

 String get id; String get bankName; String get accountHolderName; String get accountNumber; String get ifscCode; String? get branch; String? get upiId; bool get isPrimary; String get verificationStatus;
/// Create a copy of BankAccountModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BankAccountModelCopyWith<BankAccountModel> get copyWith => _$BankAccountModelCopyWithImpl<BankAccountModel>(this as BankAccountModel, _$identity);

  /// Serializes this BankAccountModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BankAccountModel&&(identical(other.id, id) || other.id == id)&&(identical(other.bankName, bankName) || other.bankName == bankName)&&(identical(other.accountHolderName, accountHolderName) || other.accountHolderName == accountHolderName)&&(identical(other.accountNumber, accountNumber) || other.accountNumber == accountNumber)&&(identical(other.ifscCode, ifscCode) || other.ifscCode == ifscCode)&&(identical(other.branch, branch) || other.branch == branch)&&(identical(other.upiId, upiId) || other.upiId == upiId)&&(identical(other.isPrimary, isPrimary) || other.isPrimary == isPrimary)&&(identical(other.verificationStatus, verificationStatus) || other.verificationStatus == verificationStatus));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,bankName,accountHolderName,accountNumber,ifscCode,branch,upiId,isPrimary,verificationStatus);

@override
String toString() {
  return 'BankAccountModel(id: $id, bankName: $bankName, accountHolderName: $accountHolderName, accountNumber: $accountNumber, ifscCode: $ifscCode, branch: $branch, upiId: $upiId, isPrimary: $isPrimary, verificationStatus: $verificationStatus)';
}


}

/// @nodoc
abstract mixin class $BankAccountModelCopyWith<$Res>  {
  factory $BankAccountModelCopyWith(BankAccountModel value, $Res Function(BankAccountModel) _then) = _$BankAccountModelCopyWithImpl;
@useResult
$Res call({
 String id, String bankName, String accountHolderName, String accountNumber, String ifscCode, String? branch, String? upiId, bool isPrimary, String verificationStatus
});




}
/// @nodoc
class _$BankAccountModelCopyWithImpl<$Res>
    implements $BankAccountModelCopyWith<$Res> {
  _$BankAccountModelCopyWithImpl(this._self, this._then);

  final BankAccountModel _self;
  final $Res Function(BankAccountModel) _then;

/// Create a copy of BankAccountModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? bankName = null,Object? accountHolderName = null,Object? accountNumber = null,Object? ifscCode = null,Object? branch = freezed,Object? upiId = freezed,Object? isPrimary = null,Object? verificationStatus = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,bankName: null == bankName ? _self.bankName : bankName // ignore: cast_nullable_to_non_nullable
as String,accountHolderName: null == accountHolderName ? _self.accountHolderName : accountHolderName // ignore: cast_nullable_to_non_nullable
as String,accountNumber: null == accountNumber ? _self.accountNumber : accountNumber // ignore: cast_nullable_to_non_nullable
as String,ifscCode: null == ifscCode ? _self.ifscCode : ifscCode // ignore: cast_nullable_to_non_nullable
as String,branch: freezed == branch ? _self.branch : branch // ignore: cast_nullable_to_non_nullable
as String?,upiId: freezed == upiId ? _self.upiId : upiId // ignore: cast_nullable_to_non_nullable
as String?,isPrimary: null == isPrimary ? _self.isPrimary : isPrimary // ignore: cast_nullable_to_non_nullable
as bool,verificationStatus: null == verificationStatus ? _self.verificationStatus : verificationStatus // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [BankAccountModel].
extension BankAccountModelPatterns on BankAccountModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BankAccountModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BankAccountModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BankAccountModel value)  $default,){
final _that = this;
switch (_that) {
case _BankAccountModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BankAccountModel value)?  $default,){
final _that = this;
switch (_that) {
case _BankAccountModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String bankName,  String accountHolderName,  String accountNumber,  String ifscCode,  String? branch,  String? upiId,  bool isPrimary,  String verificationStatus)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BankAccountModel() when $default != null:
return $default(_that.id,_that.bankName,_that.accountHolderName,_that.accountNumber,_that.ifscCode,_that.branch,_that.upiId,_that.isPrimary,_that.verificationStatus);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String bankName,  String accountHolderName,  String accountNumber,  String ifscCode,  String? branch,  String? upiId,  bool isPrimary,  String verificationStatus)  $default,) {final _that = this;
switch (_that) {
case _BankAccountModel():
return $default(_that.id,_that.bankName,_that.accountHolderName,_that.accountNumber,_that.ifscCode,_that.branch,_that.upiId,_that.isPrimary,_that.verificationStatus);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String bankName,  String accountHolderName,  String accountNumber,  String ifscCode,  String? branch,  String? upiId,  bool isPrimary,  String verificationStatus)?  $default,) {final _that = this;
switch (_that) {
case _BankAccountModel() when $default != null:
return $default(_that.id,_that.bankName,_that.accountHolderName,_that.accountNumber,_that.ifscCode,_that.branch,_that.upiId,_that.isPrimary,_that.verificationStatus);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BankAccountModel implements BankAccountModel {
  const _BankAccountModel({required this.id, required this.bankName, required this.accountHolderName, required this.accountNumber, required this.ifscCode, this.branch, this.upiId, this.isPrimary = false, required this.verificationStatus});
  factory _BankAccountModel.fromJson(Map<String, dynamic> json) => _$BankAccountModelFromJson(json);

@override final  String id;
@override final  String bankName;
@override final  String accountHolderName;
@override final  String accountNumber;
@override final  String ifscCode;
@override final  String? branch;
@override final  String? upiId;
@override@JsonKey() final  bool isPrimary;
@override final  String verificationStatus;

/// Create a copy of BankAccountModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BankAccountModelCopyWith<_BankAccountModel> get copyWith => __$BankAccountModelCopyWithImpl<_BankAccountModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BankAccountModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BankAccountModel&&(identical(other.id, id) || other.id == id)&&(identical(other.bankName, bankName) || other.bankName == bankName)&&(identical(other.accountHolderName, accountHolderName) || other.accountHolderName == accountHolderName)&&(identical(other.accountNumber, accountNumber) || other.accountNumber == accountNumber)&&(identical(other.ifscCode, ifscCode) || other.ifscCode == ifscCode)&&(identical(other.branch, branch) || other.branch == branch)&&(identical(other.upiId, upiId) || other.upiId == upiId)&&(identical(other.isPrimary, isPrimary) || other.isPrimary == isPrimary)&&(identical(other.verificationStatus, verificationStatus) || other.verificationStatus == verificationStatus));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,bankName,accountHolderName,accountNumber,ifscCode,branch,upiId,isPrimary,verificationStatus);

@override
String toString() {
  return 'BankAccountModel(id: $id, bankName: $bankName, accountHolderName: $accountHolderName, accountNumber: $accountNumber, ifscCode: $ifscCode, branch: $branch, upiId: $upiId, isPrimary: $isPrimary, verificationStatus: $verificationStatus)';
}


}

/// @nodoc
abstract mixin class _$BankAccountModelCopyWith<$Res> implements $BankAccountModelCopyWith<$Res> {
  factory _$BankAccountModelCopyWith(_BankAccountModel value, $Res Function(_BankAccountModel) _then) = __$BankAccountModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String bankName, String accountHolderName, String accountNumber, String ifscCode, String? branch, String? upiId, bool isPrimary, String verificationStatus
});




}
/// @nodoc
class __$BankAccountModelCopyWithImpl<$Res>
    implements _$BankAccountModelCopyWith<$Res> {
  __$BankAccountModelCopyWithImpl(this._self, this._then);

  final _BankAccountModel _self;
  final $Res Function(_BankAccountModel) _then;

/// Create a copy of BankAccountModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? bankName = null,Object? accountHolderName = null,Object? accountNumber = null,Object? ifscCode = null,Object? branch = freezed,Object? upiId = freezed,Object? isPrimary = null,Object? verificationStatus = null,}) {
  return _then(_BankAccountModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,bankName: null == bankName ? _self.bankName : bankName // ignore: cast_nullable_to_non_nullable
as String,accountHolderName: null == accountHolderName ? _self.accountHolderName : accountHolderName // ignore: cast_nullable_to_non_nullable
as String,accountNumber: null == accountNumber ? _self.accountNumber : accountNumber // ignore: cast_nullable_to_non_nullable
as String,ifscCode: null == ifscCode ? _self.ifscCode : ifscCode // ignore: cast_nullable_to_non_nullable
as String,branch: freezed == branch ? _self.branch : branch // ignore: cast_nullable_to_non_nullable
as String?,upiId: freezed == upiId ? _self.upiId : upiId // ignore: cast_nullable_to_non_nullable
as String?,isPrimary: null == isPrimary ? _self.isPrimary : isPrimary // ignore: cast_nullable_to_non_nullable
as bool,verificationStatus: null == verificationStatus ? _self.verificationStatus : verificationStatus // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on

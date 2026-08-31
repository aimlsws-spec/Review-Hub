// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'kyc_document_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$KycDocumentModel {

 String get id; String get userId; String get documentType; String? get fileUploadId; String? get documentNumber; String get verificationStatus; String? get verifiedBy; DateTime? get verifiedAt; String? get rejectionReason; DateTime? get expiresAt; DateTime get createdAt; DateTime get updatedAt; DateTime? get deletedAt;
/// Create a copy of KycDocumentModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$KycDocumentModelCopyWith<KycDocumentModel> get copyWith => _$KycDocumentModelCopyWithImpl<KycDocumentModel>(this as KycDocumentModel, _$identity);

  /// Serializes this KycDocumentModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is KycDocumentModel&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.documentType, documentType) || other.documentType == documentType)&&(identical(other.fileUploadId, fileUploadId) || other.fileUploadId == fileUploadId)&&(identical(other.documentNumber, documentNumber) || other.documentNumber == documentNumber)&&(identical(other.verificationStatus, verificationStatus) || other.verificationStatus == verificationStatus)&&(identical(other.verifiedBy, verifiedBy) || other.verifiedBy == verifiedBy)&&(identical(other.verifiedAt, verifiedAt) || other.verifiedAt == verifiedAt)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,documentType,fileUploadId,documentNumber,verificationStatus,verifiedBy,verifiedAt,rejectionReason,expiresAt,createdAt,updatedAt,deletedAt);

@override
String toString() {
  return 'KycDocumentModel(id: $id, userId: $userId, documentType: $documentType, fileUploadId: $fileUploadId, documentNumber: $documentNumber, verificationStatus: $verificationStatus, verifiedBy: $verifiedBy, verifiedAt: $verifiedAt, rejectionReason: $rejectionReason, expiresAt: $expiresAt, createdAt: $createdAt, updatedAt: $updatedAt, deletedAt: $deletedAt)';
}


}

/// @nodoc
abstract mixin class $KycDocumentModelCopyWith<$Res>  {
  factory $KycDocumentModelCopyWith(KycDocumentModel value, $Res Function(KycDocumentModel) _then) = _$KycDocumentModelCopyWithImpl;
@useResult
$Res call({
 String id, String userId, String documentType, String? fileUploadId, String? documentNumber, String verificationStatus, String? verifiedBy, DateTime? verifiedAt, String? rejectionReason, DateTime? expiresAt, DateTime createdAt, DateTime updatedAt, DateTime? deletedAt
});




}
/// @nodoc
class _$KycDocumentModelCopyWithImpl<$Res>
    implements $KycDocumentModelCopyWith<$Res> {
  _$KycDocumentModelCopyWithImpl(this._self, this._then);

  final KycDocumentModel _self;
  final $Res Function(KycDocumentModel) _then;

/// Create a copy of KycDocumentModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? documentType = null,Object? fileUploadId = freezed,Object? documentNumber = freezed,Object? verificationStatus = null,Object? verifiedBy = freezed,Object? verifiedAt = freezed,Object? rejectionReason = freezed,Object? expiresAt = freezed,Object? createdAt = null,Object? updatedAt = null,Object? deletedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,documentType: null == documentType ? _self.documentType : documentType // ignore: cast_nullable_to_non_nullable
as String,fileUploadId: freezed == fileUploadId ? _self.fileUploadId : fileUploadId // ignore: cast_nullable_to_non_nullable
as String?,documentNumber: freezed == documentNumber ? _self.documentNumber : documentNumber // ignore: cast_nullable_to_non_nullable
as String?,verificationStatus: null == verificationStatus ? _self.verificationStatus : verificationStatus // ignore: cast_nullable_to_non_nullable
as String,verifiedBy: freezed == verifiedBy ? _self.verifiedBy : verifiedBy // ignore: cast_nullable_to_non_nullable
as String?,verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,expiresAt: freezed == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [KycDocumentModel].
extension KycDocumentModelPatterns on KycDocumentModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _KycDocumentModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _KycDocumentModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _KycDocumentModel value)  $default,){
final _that = this;
switch (_that) {
case _KycDocumentModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _KycDocumentModel value)?  $default,){
final _that = this;
switch (_that) {
case _KycDocumentModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String userId,  String documentType,  String? fileUploadId,  String? documentNumber,  String verificationStatus,  String? verifiedBy,  DateTime? verifiedAt,  String? rejectionReason,  DateTime? expiresAt,  DateTime createdAt,  DateTime updatedAt,  DateTime? deletedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _KycDocumentModel() when $default != null:
return $default(_that.id,_that.userId,_that.documentType,_that.fileUploadId,_that.documentNumber,_that.verificationStatus,_that.verifiedBy,_that.verifiedAt,_that.rejectionReason,_that.expiresAt,_that.createdAt,_that.updatedAt,_that.deletedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String userId,  String documentType,  String? fileUploadId,  String? documentNumber,  String verificationStatus,  String? verifiedBy,  DateTime? verifiedAt,  String? rejectionReason,  DateTime? expiresAt,  DateTime createdAt,  DateTime updatedAt,  DateTime? deletedAt)  $default,) {final _that = this;
switch (_that) {
case _KycDocumentModel():
return $default(_that.id,_that.userId,_that.documentType,_that.fileUploadId,_that.documentNumber,_that.verificationStatus,_that.verifiedBy,_that.verifiedAt,_that.rejectionReason,_that.expiresAt,_that.createdAt,_that.updatedAt,_that.deletedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String userId,  String documentType,  String? fileUploadId,  String? documentNumber,  String verificationStatus,  String? verifiedBy,  DateTime? verifiedAt,  String? rejectionReason,  DateTime? expiresAt,  DateTime createdAt,  DateTime updatedAt,  DateTime? deletedAt)?  $default,) {final _that = this;
switch (_that) {
case _KycDocumentModel() when $default != null:
return $default(_that.id,_that.userId,_that.documentType,_that.fileUploadId,_that.documentNumber,_that.verificationStatus,_that.verifiedBy,_that.verifiedAt,_that.rejectionReason,_that.expiresAt,_that.createdAt,_that.updatedAt,_that.deletedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _KycDocumentModel implements KycDocumentModel {
  const _KycDocumentModel({required this.id, required this.userId, required this.documentType, this.fileUploadId, this.documentNumber, required this.verificationStatus, this.verifiedBy, this.verifiedAt, this.rejectionReason, this.expiresAt, required this.createdAt, required this.updatedAt, this.deletedAt});
  factory _KycDocumentModel.fromJson(Map<String, dynamic> json) => _$KycDocumentModelFromJson(json);

@override final  String id;
@override final  String userId;
@override final  String documentType;
@override final  String? fileUploadId;
@override final  String? documentNumber;
@override final  String verificationStatus;
@override final  String? verifiedBy;
@override final  DateTime? verifiedAt;
@override final  String? rejectionReason;
@override final  DateTime? expiresAt;
@override final  DateTime createdAt;
@override final  DateTime updatedAt;
@override final  DateTime? deletedAt;

/// Create a copy of KycDocumentModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$KycDocumentModelCopyWith<_KycDocumentModel> get copyWith => __$KycDocumentModelCopyWithImpl<_KycDocumentModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$KycDocumentModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _KycDocumentModel&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.documentType, documentType) || other.documentType == documentType)&&(identical(other.fileUploadId, fileUploadId) || other.fileUploadId == fileUploadId)&&(identical(other.documentNumber, documentNumber) || other.documentNumber == documentNumber)&&(identical(other.verificationStatus, verificationStatus) || other.verificationStatus == verificationStatus)&&(identical(other.verifiedBy, verifiedBy) || other.verifiedBy == verifiedBy)&&(identical(other.verifiedAt, verifiedAt) || other.verifiedAt == verifiedAt)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,documentType,fileUploadId,documentNumber,verificationStatus,verifiedBy,verifiedAt,rejectionReason,expiresAt,createdAt,updatedAt,deletedAt);

@override
String toString() {
  return 'KycDocumentModel(id: $id, userId: $userId, documentType: $documentType, fileUploadId: $fileUploadId, documentNumber: $documentNumber, verificationStatus: $verificationStatus, verifiedBy: $verifiedBy, verifiedAt: $verifiedAt, rejectionReason: $rejectionReason, expiresAt: $expiresAt, createdAt: $createdAt, updatedAt: $updatedAt, deletedAt: $deletedAt)';
}


}

/// @nodoc
abstract mixin class _$KycDocumentModelCopyWith<$Res> implements $KycDocumentModelCopyWith<$Res> {
  factory _$KycDocumentModelCopyWith(_KycDocumentModel value, $Res Function(_KycDocumentModel) _then) = __$KycDocumentModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String userId, String documentType, String? fileUploadId, String? documentNumber, String verificationStatus, String? verifiedBy, DateTime? verifiedAt, String? rejectionReason, DateTime? expiresAt, DateTime createdAt, DateTime updatedAt, DateTime? deletedAt
});




}
/// @nodoc
class __$KycDocumentModelCopyWithImpl<$Res>
    implements _$KycDocumentModelCopyWith<$Res> {
  __$KycDocumentModelCopyWithImpl(this._self, this._then);

  final _KycDocumentModel _self;
  final $Res Function(_KycDocumentModel) _then;

/// Create a copy of KycDocumentModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? documentType = null,Object? fileUploadId = freezed,Object? documentNumber = freezed,Object? verificationStatus = null,Object? verifiedBy = freezed,Object? verifiedAt = freezed,Object? rejectionReason = freezed,Object? expiresAt = freezed,Object? createdAt = null,Object? updatedAt = null,Object? deletedAt = freezed,}) {
  return _then(_KycDocumentModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,documentType: null == documentType ? _self.documentType : documentType // ignore: cast_nullable_to_non_nullable
as String,fileUploadId: freezed == fileUploadId ? _self.fileUploadId : fileUploadId // ignore: cast_nullable_to_non_nullable
as String?,documentNumber: freezed == documentNumber ? _self.documentNumber : documentNumber // ignore: cast_nullable_to_non_nullable
as String?,verificationStatus: null == verificationStatus ? _self.verificationStatus : verificationStatus // ignore: cast_nullable_to_non_nullable
as String,verifiedBy: freezed == verifiedBy ? _self.verifiedBy : verifiedBy // ignore: cast_nullable_to_non_nullable
as String?,verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,expiresAt: freezed == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on

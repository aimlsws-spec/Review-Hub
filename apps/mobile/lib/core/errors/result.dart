import 'failure.dart';

/// A lightweight `Either<Failure, T>` substitute so repositories can return
/// typed success/failure without throwing across layers, without pulling in
/// a functional-programming package for just this one shape.
sealed class Result<T> {
  const Result();

  const factory Result.success(T value) = Success<T>;
  const factory Result.failure(Failure failure) = ResultFailure<T>;

  bool get isSuccess => this is Success<T>;
  bool get isFailure => this is ResultFailure<T>;

  /// Returns the success value, or `null` if this is a failure.
  T? get valueOrNull => switch (this) {
        Success<T>(value: final v) => v,
        ResultFailure<T>() => null,
      };

  /// Returns the failure, or `null` if this is a success.
  Failure? get failureOrNull => switch (this) {
        Success<T>() => null,
        ResultFailure<T>(failure: final f) => f,
      };

  R when<R>({
    required R Function(T value) success,
    required R Function(Failure failure) failure,
  }) =>
      switch (this) {
        Success<T>(value: final v) => success(v),
        ResultFailure<T>(failure: final f) => failure(f),
      };

  Result<R> map<R>(R Function(T value) transform) => switch (this) {
        Success<T>(value: final v) => Result.success(transform(v)),
        ResultFailure<T>(failure: final f) => Result.failure(f),
      };
}

final class Success<T> extends Result<T> {
  const Success(this.value);
  final T value;
}

final class ResultFailure<T> extends Result<T> {
  const ResultFailure(this.failure);
  final Failure failure;
}

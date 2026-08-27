import 'package:equatable/equatable.dart';

/// Mirrors the backend's error envelope (`GlobalExceptionFilter` →
/// `{success:false, statusCode, code, message, details}`), mapped into a
/// typed failure a repository can return instead of throwing.
sealed class Failure extends Equatable {
  const Failure(this.message, {this.code, this.statusCode});

  final String message;
  final String? code;
  final int? statusCode;

  @override
  List<Object?> get props => [message, code, statusCode];
}

/// No network connectivity, or the request timed out before reaching the server.
class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No internet connection. Please try again.']);
}

/// 401 — access token missing/expired and the refresh attempt also failed.
class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure([super.message = 'Your session has expired. Please sign in again.']);
}

/// 403 — authenticated, but not permitted to perform this action.
class ForbiddenFailure extends Failure {
  const ForbiddenFailure([super.message = 'You do not have permission to do that.']);
}

/// 404
class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'The requested resource was not found.']);
}

/// 409 — e.g. duplicate email/phone on registration.
class ConflictFailure extends Failure {
  const ConflictFailure([super.message = 'This already exists.']);
}

/// 400 / 422 — validation errors. [fieldErrors] mirrors the backend's
/// `details` map (field name → messages) when present.
class ValidationFailure extends Failure {
  const ValidationFailure(
    super.message, {
    this.fieldErrors = const {},
  });

  final Map<String, List<String>> fieldErrors;

  @override
  List<Object?> get props => [message, code, statusCode, fieldErrors];
}

/// 429 — rate limited.
class RateLimitedFailure extends Failure {
  const RateLimitedFailure([super.message = 'Too many attempts. Please wait and try again.']);
}

/// 5xx
class ServerFailure extends Failure {
  const ServerFailure([super.message = 'Something went wrong on our end. Please try again.']);
}

/// Anything that doesn't map to the above (parsing errors, unexpected shapes, etc).
class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'An unexpected error occurred.']);
}

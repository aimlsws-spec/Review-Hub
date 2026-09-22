/// Mirrors the response of `GET /app-config`: whether the platform is in maintenance, and whether this build is too
/// old to keep working.
class AppConfigModel {
  const AppConfigModel({
    required this.maintenanceMode,
    required this.maintenanceMessage,
    required this.minimumAppVersion,
    required this.updateRequired,
    this.updateUrl,
  });

  final bool maintenanceMode;
  final String maintenanceMessage;
  final String minimumAppVersion;

  /// Decided by the server from the version this app sent, so the rule can change without a new app.
  final bool updateRequired;

  /// Where to send people to update, usually the store page. Null when the admin has not set one.
  final String? updateUrl;

  factory AppConfigModel.fromJson(Map<String, dynamic> json) {
    final url = json['updateUrl'];
    final message = json['maintenanceMessage'];
    return AppConfigModel(
      // Only an explicit true turns the app off: a missing or odd value must not lock everyone out.
      maintenanceMode: json['maintenanceMode'] == true,
      maintenanceMessage: message is String && message.trim().isNotEmpty
          ? message.trim()
          : 'We are making improvements and will be back shortly.',
      minimumAppVersion: json['minimumAppVersion'] is String ? json['minimumAppVersion'] as String : '',
      updateRequired: json['updateRequired'] == true,
      updateUrl: url is String && url.trim().isNotEmpty ? url.trim() : null,
    );
  }
}

/// What the app should be showing, as far as the server is concerned.
sealed class AppAvailability {
  const AppAvailability();
}

/// Nothing is stopping the app.
class AppOpen extends AppAvailability {
  const AppOpen();
}

/// The platform is switched to maintenance.
class AppInMaintenance extends AppAvailability {
  const AppInMaintenance(this.message);

  final String message;
}

/// This build is older than the oldest the server still supports.
class AppNeedsUpdate extends AppAvailability {
  const AppNeedsUpdate({required this.minimumVersion, this.updateUrl});

  final String minimumVersion;
  final String? updateUrl;
}

/// Decides what to show. Maintenance comes first: an app that also needs an update can not do anything about it
/// until the platform is back.
AppAvailability availabilityOf(AppConfigModel config) {
  if (config.maintenanceMode) return AppInMaintenance(config.maintenanceMessage);
  if (config.updateRequired) return AppNeedsUpdate(minimumVersion: config.minimumAppVersion, updateUrl: config.updateUrl);
  return const AppOpen();
}

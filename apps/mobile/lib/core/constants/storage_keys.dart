/// Keys used with [FlutterSecureStorage] and Hive boxes.
class StorageKeys {
  StorageKeys._();

  // Secure storage (tokens)
  static const String accessToken = 'vk_access_token';
  static const String refreshToken = 'vk_refresh_token';

  // Secure storage (install id sent as X-Device-ID)
  static const String deviceId = 'vk_device_id';

  // Hive boxes
  static const String settingsBox = 'vk_settings_box';
  static const String userBox = 'vk_user_box';

  // Hive keys within settingsBox
  static const String onboardingSeen = 'onboarding_seen';
  static const String themeMode = 'theme_mode';
  static const String languageCode = 'language_code';
  static const String appLockEnabled = 'app_lock_enabled';
  static const String savedCampaignIds = 'saved_campaign_ids';
}

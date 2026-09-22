/** The settings the server checks on every request. */
export interface AppConfigSnapshot {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minimumAppVersion: string;
  updateUrl: string | null;
}

/** What the app is told when it asks: the settings, and whether this build has to update. */
export interface PublicAppConfig extends AppConfigSnapshot {
  updateRequired: boolean;
}

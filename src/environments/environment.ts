/** Local development configuration. No secrets should be stored in a browser app. */
export const environment = {
  // Served through Angular's development proxy: /api -> https://localhost:7175.
  apiBaseUrl: '/api/v1',
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'vetpax',
  keycloakClientId: 'vetpax-dev',
};

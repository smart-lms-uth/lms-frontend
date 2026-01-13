export const environment = {
  production: false,
  // Gateway URL - all API calls go through gateway
  apiUrl: 'http://localhost:8888/api/v1',
  // Gateway base URL (no path prefix) for OAuth2
  gatewayUrl: 'http://localhost:8888',
  // Course service uses /api prefix (not /api/v1)
  courseApiUrl: 'http://localhost:8888/api',
  // AI service via gateway
  aiApiUrl: 'http://localhost:8888/api/v1/ai',
  // OAuth2 config
  googleClientId: '373775899700-d7p32g9m6n2diinqh9tvjsfhd463r9e5.apps.googleusercontent.com',
  oauth2RedirectUri: 'http://localhost:4200/oauth2/callback'
};

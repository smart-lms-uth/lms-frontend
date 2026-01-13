export const environment = {
  production: true,
  // All API via nginx proxy to gateway
  apiUrl: '/api/v1',
  gatewayUrl: '',  // Empty for relative paths in production
  courseApiUrl: '/api',
  aiApiUrl: '/api/v1/ai',
  // OAuth2 config
  googleClientId: '373775899700-d7p32g9m6n2diinqh9tvjsfhd463r9e5.apps.googleusercontent.com',
  oauth2RedirectUri: '/oauth2/callback'
};

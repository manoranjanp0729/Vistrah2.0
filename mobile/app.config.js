// Extend app.json, retaining local EAS project linkage and native build settings.
module.exports = ({config}) => process.env.EXPO_PUBLIC_WEB_SESSION_MODE === 'cookie'
  ? {...config, web: {...config.web, output: 'single'}, experiments: {...config.experiments, baseUrl: '/app'}}
  : config;

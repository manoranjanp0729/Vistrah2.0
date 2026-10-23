// Extend app.json, retaining local EAS project linkage and native build settings.
module.exports = ({config}) => {
  require('./scripts/validate-build-environment.cjs').validateBuildEnvironment();
  const projectId=config.extra?.eas?.projectId;
  if(!projectId)throw new Error('OTA updates require the existing EAS project linkage.');
  const ota={runtimeVersion:{policy:'fingerprint'},updates:{...config.updates,url:`https://u.expo.dev/${projectId}`,checkAutomatically:'ON_LOAD',fallbackToCacheTimeout:0}};
  const adaptiveIcon = {...config.android?.adaptiveIcon};
  delete adaptiveIcon.backgroundImage;
  const plugins = (config.plugins ?? []).filter(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) !== 'expo-splash-screen');
  plugins.push('expo-video');
  const googleIosScheme=process.env.GOOGLE_IOS_URL_SCHEME;
  if(googleIosScheme)plugins.push(['@react-native-google-signin/google-signin',{iosUrlScheme:googleIosScheme}]);
  plugins.push(['expo-splash-screen',{image:'./assets/brand/lockup-light.png',imageWidth:240,resizeMode:'contain',backgroundColor:'#f7f7f8'}]);
  const branded = {...config, ...ota, userInterfaceStyle:'light', plugins, icon:'./assets/brand/icon.png', android:{...config.android, adaptiveIcon:{...adaptiveIcon, backgroundColor:'#11243f', foregroundImage:'./assets/brand/adaptive-foreground.png', monochromeImage:'./assets/brand/monochrome.png'}}, web:{...config.web, favicon:'./assets/brand/favicon.png'}};
  return process.env.EXPO_PUBLIC_WEB_SESSION_MODE === 'cookie'
    ? {...branded, web: {...branded.web, output:'single'}, experiments: {...branded.experiments, baseUrl:'/app'}}
    : branded;
};


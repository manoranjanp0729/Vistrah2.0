// Extend app.json, retaining local EAS project linkage and native build settings.
module.exports = ({config}) => {
  const adaptiveIcon = {...config.android?.adaptiveIcon};
  delete adaptiveIcon.backgroundImage;
  const branded = {...config, icon:'./assets/brand/icon.png', android:{...config.android, adaptiveIcon:{...adaptiveIcon, backgroundColor:'#11243f', foregroundImage:'./assets/brand/adaptive-foreground.png', monochromeImage:'./assets/brand/monochrome.png'}}, web:{...config.web, favicon:'./assets/brand/favicon.png'}};
  return process.env.EXPO_PUBLIC_WEB_SESSION_MODE === 'cookie'
    ? {...branded, web: {...branded.web, output:'single'}, experiments: {...branded.experiments, baseUrl:'/app'}}
    : branded;
};

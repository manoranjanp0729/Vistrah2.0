const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Web and native use the same validated commerce contract as the desktop client.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')];
module.exports = config;

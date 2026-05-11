const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'content/index': './src/content/index.js',
    'popup/popup': './src/popup/popup.js',
    'background/service-worker': './src/background/service-worker.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'popup/popup.css' },
        { from: 'src/options/options.html', to: 'options/options.html' },
        { from: 'src/options/options.js', to: 'options/options.js' },
        { from: 'src/options/options.css', to: 'options/options.css' },
        { from: 'src/content/styles/content.css', to: 'content/styles/content.css' },
        { from: 'src/assets', to: 'assets' }
      ]
    })
  ],
  mode: 'production'
};
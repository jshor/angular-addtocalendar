const path = require('path')
const MinifyPlugin = require('babel-minify-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const plugins = [new MinifyPlugin()]

if (process.argv.includes('--analyze')) {
  plugins.push(new BundleAnalyzerPlugin())
}

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, './build/dist'),      
    filename: 'datebook.js',      
    library: 'datebook',      
    libraryTarget: 'umd'
  },
  target: 'node',
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  plugins,
  mode: 'production'
}
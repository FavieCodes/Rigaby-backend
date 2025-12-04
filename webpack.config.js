const path = require('path');

module.exports = {
  entry: './src/lambda.ts',
  target: 'node',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.json'
          }
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'src': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    path: path.resolve(__dirname, 'netlify/functions/main'),
    filename: 'main.js',
    libraryTarget: 'commonjs2',
  },
  optimization: {
    minimize: false,
  },
  // Bundle all dependencies except those that should be external
  externals: {
    // AWS SDK is available in Lambda environment
    'aws-sdk': 'aws-sdk',
  },
};
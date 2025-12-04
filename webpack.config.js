const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/lambda.ts',
  target: 'node',
  mode: 'production',
  externals: [nodeExternals({
    allowlist: ['@vendia/serverless-express', 'class-transformer', 'class-validator']
  })],
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
    path: path.resolve(__dirname, 'netlify/functions'),
    filename: 'main.js',
    libraryTarget: 'commonjs2',
  },
  optimization: {
    minimize: false,
  },
};
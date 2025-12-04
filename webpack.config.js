const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/lambda.ts',
  target: 'node',
  mode: 'production',
  externals: [
    nodeExternals({
      // Bundle everything EXCEPT these native modules
      allowlist: [
        /.*/,  // Bundle everything by default
      ],
      // Only externalize these specific packages that must be external
      externalsPresets: { node: true }
    }),
    // Explicitly externalize only truly problematic packages
    '@prisma/engines',
    'prisma',
  ],
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
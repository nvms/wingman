// @ts-check

'use strict';

const path = require('node:path');

// @ts-check
/* @typedef {import('webpack').Configuration} WebpackConfig */

const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    'playwright-core': 'commonjs2 playwright-core',
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  experiments: {
    asyncWebAssembly: true,
  },
};

// const webviewConfig = {
//   target: 'web',
//   mode: 'none',

//   entry: {
//     main: './src/webview/main.ts'
//   },
//   output: {
//     path: path.resolve(__dirname, 'dist'),
//     filename: 'main.js'
//   },
//   resolve: {
//     extensions: ['.ts', '.js']
//   },
//   module: {
//     rules: [
//       {
//         test: /\.ts$/,
//         exclude: /node_modules/,
//         use: [
//           {
//             loader: 'ts-loader'
//           }
//         ]
//       }
//     ]
//   },
//   devtool: 'nosources-source-map'
// };
// module.exports = [ extensionConfig, webviewConfig ];
module.exports = [ extensionConfig ];
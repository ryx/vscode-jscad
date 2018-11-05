/**
 * This file is loaded inside the webview and controls the behavior of the JSCAD editor.
 * Thankfully, we are inside a Chrome and have access to most ES6 language features,
 * including ES6 modules :) ..
 */
import JSCADPreview from './JSCADPreview.mjs';

// main logic (pass global reference to VSCode WebView API)
(function(vscode) {
  window.addEventListener('DOMContentLoaded', () => {
    // create our custom preview handler (@TODO: pass options)
    const preview = new JSCADPreview(vscode, gProcessor);
  });
}(acquireVsCodeApi()));

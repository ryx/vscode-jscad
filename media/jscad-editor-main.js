/**
 * This file is loaded inside the webview and controls the behavior of the JSCAD editor.
 */
(function (vscode) {
    // register our postMessage handler
    window.addEventListener('message', function (event) {
        var msg = event.data;
        switch(msg.command) {
            case 'setData':
                gProcessor.setJsCad(msg.data);
                break;
            default:
                vscode.postMessage({ command: 'alert', data: 'Unknown command: ' + JSON.stringify(msg) });
        }
    });

  // resize handling
  window.addEventListener('resize', function () {
    var canvas = document.querySelector('#viewerContext canvas');
    canvas.width = window.innerWidth;
    canvas.width = window.innerHeight;
  });
}(acquireVsCodeApi()));

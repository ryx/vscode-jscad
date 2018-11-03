/**
 * This file is loaded inside the webview and controls the behavior of the JSCAD editor.
 */
(function (vscode) {
    // send a message to the extension in VSCode
    function sendMessage(command, text) {
        vscode.postMessage({ command, text });
    }

    // register our postMessage handler to receive messages from the extension in VSCode
    window.addEventListener('message', function (event) {
        var msg = event.data;
        switch(msg.command) {
            case 'setData':
                gProcessor.setJsCad(msg.data);
                break;
            default:
                sendMessage('alert', 'Unknown command: ' + JSON.stringify(msg));
        }
    });

  // resize handling
  window.addEventListener('resize', function () {
    var canvas = document.querySelector('#viewerContext canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  // some tweaks to processor (@FIXME: we should use our own Processor instead of this hack!)
  window.addEventListener('DOMContentLoaded', function () {
    sendMessage('initialized');
    gProcessor.setStatus = function (status, data) {
        const statusMap = {
            error: data,
            ready: 'Ready',
            aborted: 'Aborted.',
            busy: `${data}`,
            loading: `Loading ${data}`,
            loaded: data,
            saving: data,
            saved: data,
            converting: `Converting ${data}`,
            fetching: `Fetching ${data}`,
            rendering: `Rendering`
        };
        sendMessage('status', statusMap[status]);
    }
  });

}(acquireVsCodeApi()));

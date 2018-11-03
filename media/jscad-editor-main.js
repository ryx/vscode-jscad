/**
 * This file is loaded inside the webview and controls the behavior of the JSCAD editor.
 * Thankfully, we are inside a Chrome and have access to most ES6 language features :) ..
 */
(function (vscode) {
    // send a message to the extension in VSCode
    function sendMessage(command, text) {
        vscode.postMessage({ command, text });
    }

    function setViewerAngle(x, y, z) {
        const viewer = gProcessor.viewer;
        viewer.angleX = x;
        viewer.angleY = y;
        viewer.angleZ = z;
        viewer.onDraw();
    }

    function setViewerViewpoint(x, y, z) {
        const viewer = gProcessor.viewer;
        viewer.viewpointX = x;
        viewer.viewpointY = y;
        viewer.viewpointZ = z;
        viewer.onDraw();
    }

    function setViewport(preset) {
        setViewerViewpoint(0, 0, 90);
        switch(preset) {
            case 'scene':
                gProcessor.viewer.resetCamera();
                break;
            case 'top':
                setViewerAngle(0, 0, -90);
                break;
            case 'front':
                setViewerAngle(-90, 0, -90);
                break;
            case 'back':
                setViewerAngle(-90, 0, 90);
                break;
            case 'left':
                setViewerAngle(-90, 0, 0);
                break;
            case 'right':
                setViewerAngle(-90, 0, 180);
                break;
            default:
                throw Error(`Unknown viewport preset: ${preset}`);
        }
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

  // main logic
  window.addEventListener('DOMContentLoaded', function () {
    // init controls
    const controls = document.querySelectorAll('[data-action-viewport]');
    if (controls) {
        controls.forEach(el =>
            el.addEventListener('click', () => setViewport(el.getAttribute('data-action-viewport')))
        );
    }

    // some tweaks to processor (@FIXME: we should use our own Processor instead of this hack!)
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

    // fire onDidInitialized on JSCADPreviewPanel
    sendMessage('initialized');
  });

}(acquireVsCodeApi()));

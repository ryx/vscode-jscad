/**
 * This file is loaded inside the webview and controls the behavior of the JSCAD editor.
 * Thankfully, we are inside a Chrome and have access to most ES6 language features :) ..
 *
 * NOTE: This utilizes the compiled JSCAD.org web viewer build from
 * https://github.com/jscad/OpenJSCAD.org/blob/master/packages/web/dist/opt.js because there is
 * just no better way to het a JSCAD view yet.
 * If the official viewer in https://github.com/jscad/OpenJSCAD.org/tree/master/packages/web/src/ui/viewer
 * would be more modular, we could ditch this hack around fiddling with "gProcessor" and
 * instead import a real module and use that in a dedicated viewer build. Until such module
 * exists, we have to do it the ugly way ..
 */
(function (vscode) {
  // send a message to the extension in VSCode
  function sendMessage(command, text) {
    vscode.postMessage({ command, text });
  }

  // set angle in viewer
  function setViewerAngle(x, y, z) {
    const viewer = gProcessor.viewer;
    viewer.angleX = x;
    viewer.angleY = y;
    viewer.angleZ = z;
    viewer.onDraw();
  }

  // set viewport in viewer
  function setViewerViewpoint(x, y, z) {
    const viewer = gProcessor.viewer;
    viewer.viewpointX = x;
    viewer.viewpointY = y;
    viewer.viewpointZ = z;
    viewer.onDraw();
  }

  // set background color of viewer as RGBA (0-based floats)
  function setViewerBGColor(r, g, b, a) {
    gProcessor.viewer.gl.clearColor(r, g, b, a);
    gProcessor.viewer.onDraw();
  }

  // set view based on predefined constants
  // @TODO: calculate size of objects in scene and adjust view accordingly
  function setViewport(preset) {
    setViewerViewpoint(0, 0, 90);
    switch (preset) {
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
    switch (msg.command) {
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

    // config (@TODO: should use settings from VSCode for coloring and custom defaults)
    setViewerBGColor(0.2, 0.2, 0.2, 1);
    gProcessor.viewer.setPlateOptions({
      draw: true,
      size: 200,
      m: {
        i: 1, // number of units between minor grid lines
        color: {r: 0.8, g: 0.8, b: 0.8, a: 0.5} // color
      },
      M: {i:10, color: {r: 0.25, g: 0.25, b: 0.25, a: 0.5}}
    });
    gProcessor.viewer.setSolidOptions({
      faceColor: {r: 0.4, g: 0.5, b: 1.0, a: 1},        // default face color
    });

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

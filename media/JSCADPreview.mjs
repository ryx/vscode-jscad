/**
 * Controller for application logic inside the webview.
 *
 * NOTE: This utilizes the compiled JSCAD.org web viewer build from
 * https://github.com/jscad/OpenJSCAD.org/blob/master/packages/web/dist/opt.js because there is
 * just no better way to get a JSCAD view yet.
 *
 * If the official viewer in https://github.com/jscad/OpenJSCAD.org/tree/master/packages/web/src/ui/viewer
 * would be more modular, we could ditch this hack around fiddling with "gProcessor" and
 * instead import a real module and use that in a dedicated viewer build. Until such module
 * exists, we have to do it the ugly way ..
 */
export default class JSCADPreview {
  constructor(vscode, processor, options = {}) {
    this.vscode = vscode;
    this.processor = processor;
    this.viewer = processor.viewer;
    this.currentFileName = null;
    this.settingsCache = vscode.getState() || {};

    // register our postMessage handler to receive messages from the extension in VSCode
    window.addEventListener('message', (event) => {
      var msg = event.data;
      switch (msg.command) {
        case 'setData':
          this.setJSCADData(msg.data.data, msg.data.fileName);
          break;
        default:
          this.sendMessageToVSCode('alert', 'Unknown command: ' + JSON.stringify(msg));
      }
    });

    // resize handling
    window.addEventListener('resize', () => this.viewer.resizeCanvas());

    // init controls
    const controls = document.querySelectorAll('[data-action-viewport]');
    if (controls) {
      controls.forEach(el =>
        el.addEventListener('click', () => this.setViewport(el.getAttribute('data-action-viewport')))
      );
    }

    // @HACK: override Processor.setStatus to log to status bar
    processor.setStatus = (status, data) => {
      /* @TODO: send errors to console
      if (status === 'error') {
        this.sendMessageToVSCode('error', data);
        return;
      }
      */
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
      this.sendMessageToVSCode('status', statusMap[status]);
    };

    // init
    this.setViewerBGColor(0.2, 0.2, 0.2, 1);  // @FIXME: take from options instead
    this.applyInitialViewerOptions();
    this.sendMessageToVSCode('initialized');
  }

  applyInitialViewerOptions() {
    this.viewer.setPlateOptions({
      draw: true,
      size: 200,
      m: {
        i: 1, // number of units between minor grid lines
        color: {r: 0.8, g: 0.8, b: 0.8, a: 0.5} // color
      },
      M: {i:10, color: {r: 0.25, g: 0.25, b: 0.25, a: 0.5}}
    });
    this.viewer.setSolidOptions({
      faceColor: {r: 0.4, g: 0.5, b: 1.0, a: 1},        // default face color
    });
    this.viewer.onDraw();
  }

  /**
   * Send a message to the extension in VSCode
   */
  sendMessageToVSCode(command, text) {
    this.vscode.postMessage({ command, text });
  }

  getViewportSettings() {
    return {
      angleX: this.viewer.angleX,
      angleY: this.viewer.angleY,
      angleZ: this.viewer.angleZ,
      viewpointX: this.viewer.viewpointX,
      viewpointY: this.viewer.viewpointY,
      viewpointZ: this.viewer.viewpointZ,
    };
  }

  setViewportSettings(settings) {
    this.viewer.angleX = settings.angleX;
    this.viewer.angleY = settings.angleY;
    this.viewer.angleZ = settings.angleZ;
    this.viewer.viewpointX = settings.viewpointX;
    this.viewer.viewpointY = settings.viewpointY;
    this.viewer.viewpointZ = settings.viewpointZ;
  }

  /**
   * Set JSCAD contents and restore view settings (if previously stored)
   */
  setJSCADData(data, fileName) {
    this.processor.setJsCad(data);
    // save current settings (if a file is loaded)
    if (this.currentFileName) {
      console.log('saving viewport settings');
      this.settingsCache[this.currentFileName] = this.getViewportSettings();
      // and store entire state in VSCode
      this.vscode.setState(this.settingsCache);
    }
    // restore settings for new file
    if (typeof this.settingsCache[fileName] !== 'undefined') {
      this.setViewportSettings(this.settingsCache[fileName]);
    }
    this.currentFileName = fileName;
  }

  /**
   * Set angle in viewer.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setViewerAngle(x, y, z) {
    const viewer = this.viewer;
    viewer.angleX = x;
    viewer.angleY = y;
    viewer.angleZ = z;
    viewer.onDraw();
  }

  /**
   * Set viewport position in viewer.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setViewerViewpoint(x, y, z) {
    const viewer = this.viewer;
    viewer.viewpointX = x;
    viewer.viewpointY = y;
    viewer.viewpointZ = z;
    viewer.onDraw();
  }

  /**
   * Set background color of viewer as RGBA (0-based floats).
   */
  setViewerBGColor(r, g, b, a) {
    this.viewer.gl.clearColor(r, g, b, a);
    this.viewer.onDraw();
  }

  /**
   * Set view based on predefined constants
   * @TODO: calculate size of objects in scene and adjust view accordingly
   */
  setViewport(preset) {
    this.setViewerViewpoint(0, 0, 90);
    switch (preset) {
      case 'scene':
        this.viewer.resetCamera();
        break;
      case 'top':
        this.setViewerAngle(0, 0, -90);
        break;
      case 'front':
        this.setViewerAngle(-90, 0, -90);
        break;
      case 'back':
        this.setViewerAngle(-90, 0, 90);
        break;
      case 'left':
        this.setViewerAngle(-90, 0, 0);
        break;
      case 'right':
        this.setViewerAngle(-90, 0, 180);
        break;
      default:
        throw Error(`Unknown viewport preset: ${preset}`);
    }
  }
}

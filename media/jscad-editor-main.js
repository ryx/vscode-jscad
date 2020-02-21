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
class JSCADPreview {
  constructor(vscode, processor, containerId, options = {}) {
    this.vscode = vscode;
    this.processor = processor;
    this.viewer = processor.viewer;
    this.currentFileName = null;
    this.settingsCache = vscode.getState() || {};
    this.container = document.querySelector(containerId);

    // register our postMessage handler to receive messages from the extension in VSCode
    window.addEventListener('message', event => this.onReceiveMessage(event));

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

      // for debugging:
      window.jscadViewer = this;
    };

    // init
    // @FIXME: take appropriate color values from CSS instead (via getComputedStyle)
    if (document.querySelector('body.vscode-light')) {
      this.setViewerBGColor(0.9, 0.9, 0.9, 1);
    } else {
      this.setViewerBGColor(0.2, 0.2, 0.2, 1);
    }
    this.applyInitialViewerOptions();

    // notify webview about being ready
    this.sendMessageToVSCode('initialized');
  }

  onReceiveMessage() {
    var msg = event.data;
    console.log('JSCADPreview: receiving message', msg);
    switch (msg.command) {
      case 'setData':
        this.setJSCADData(msg.data.data, msg.data.fileName);
        break;
      default:
        this.sendMessageToVSCode('alert', 'Unknown command: ' + JSON.stringify(msg));
    }
  }

  applyInitialViewerOptions() {
    this.viewer.setPlateOptions({
      draw: true,
      size: 500,
      m: {
        i: 1, // number of units between minor grid lines
        color: {r: 0.8, g: 0.8, b: 0.8, a: 0.5} // color
      },
      M: {i:10, color: {r: 0.25, g: 0.25, b: 0.25, a: 0.5}}
    });
    // set default face color to some theme value
    const faceColor = this.getVSCodeThemeColor('button-background');
    const faceColorRGB = this.parseRGBColor(faceColor);
    this.viewer.setSolidOptions({
      faceColor: {r: 0.8, g: 0.8, b: 0.8, a: 0.2}, // faceColorRGB,
      outlineColor: {r: 1, g: 1, b: 1, a: 1}, 
      faces: false,
      draw: false,
      lines: true,
    });
    this.viewer.onDraw();
  }

  /**
   * Reads a color value from the VSCode theme engine by applying it to an element's background and
   * reading rendered color as rgb() using window.getComputedStyle(). Color values are set according
   * to the list under https://code.visualstudio.com/docs/getstarted/theme-color-reference. Dots ('.')
   * need to be replaced with dashes ('-').
   *
   * @param colorName CSS representation of color name
   */
  getVSCodeThemeColor(colorName) {
    const el = document.createElement('div');
    el.style = `width: 10px; height: 10px; position: absolute; top: -100px; left: -100px; background: var(--vscode-${colorName});`;
    document.body.appendChild(el);
    const styles = window.getComputedStyle(el);
    return styles.backgroundColor;
  }

  /**
   * Parse CSS-style "rgb(r,g,b)" color value and return it as object with r/g/b(/a) properties.
   * Throws error if color cannot be parsed.
   */
  parseRGBColor(color) {
    const m = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (m) {
      return {
        r: parseInt(m[1], 10) / 255,
        g: parseInt(m[2], 10) / 255,
        b: parseInt(m[3], 10) / 255,
        a: m[4] ? parseInt(m[3], 10) / 255 : 1,
      };
    }

    throw new Error(`JSCADVDiewer.parseRGBColor: invalid CSS color value received, ${color}`);
  }

  /**
   * Send a message to the extension in VSCode
   */
  sendMessageToVSCode(command, text = '') {
    console.log('JSCADPreview: sending message', { command, text });
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
    // update class so we know we have content
    this.container.classList.add('jscad-viewer-has-file');
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

// main logic (pass global reference to VSCode WebView API)
(function(vscode) {
  window.addEventListener('DOMContentLoaded', () => {
    // create our custom preview handler (@TODO: pass options)
    const preview = new JSCADPreview(vscode, gProcessor, '#viewerContext');
  });
}(acquireVsCodeApi()));

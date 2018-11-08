import * as path from 'path';
import {
  window,
  Disposable,
  StatusBarItem,
  StatusBarAlignment,
  Uri,
  ViewColumn,
  WebviewPanel,
  Event,
  EventEmitter,
} from 'vscode';

/**
 * Manages cat coding webview panels
 */
export default class JSCADPreviewPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: JSCADPreviewPanel | undefined;
  public static readonly viewType = 'jscadEditor';

  private readonly _panel: WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: Disposable[] = [];
  private _statusBarItem: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);

  protected _onDidInitialize = new EventEmitter();
	readonly onDidInitialize: Event<any> = this._onDidInitialize.event;

  public static createOrShow(extensionPath: string): JSCADPreviewPanel {
    const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, show it.
    if (JSCADPreviewPanel.currentPanel) {
      JSCADPreviewPanel.currentPanel._panel.reveal(column);
      return JSCADPreviewPanel.currentPanel;
    }

    // Otherwise, create a new panel.
    const panel = window.createWebviewPanel(JSCADPreviewPanel.viewType, 'JSCAD: Preview', column || ViewColumn.Two, {
      // Enable javascript in the webview
      enableScripts: true,

      // And restric the webview to only loading content from our extension's `media` directory.
      /* localResourceRoots: [
        Uri.file(path.join(extensionPath, 'media'))
      ] */
    });

    JSCADPreviewPanel.currentPanel = new JSCADPreviewPanel(panel, extensionPath, {});

    return JSCADPreviewPanel.currentPanel;
  }

  public static revive(panel: WebviewPanel, extensionPath: string, state: any): JSCADPreviewPanel {
    JSCADPreviewPanel.currentPanel = new JSCADPreviewPanel(panel, extensionPath, state);

    return JSCADPreviewPanel.currentPanel;
  }

  private constructor(
    panel: WebviewPanel,
    extensionPath: string,
    state: any,
  ) {
    this._panel = panel;
    this._extensionPath = extensionPath;

    // Set the webview's initial html content and pass state
    this._update(state);

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    /* @FIXME: this causes hard reloads, which we really only want after editor changes
    this._panel.onDidChangeViewState(e => {
      if (this._panel.visible) {
        this._update()
      }
    }, null, this._disposables);
    */

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(message => {
      console.log('JSCACPreviewPanel: received message', message);
      switch (message.command) {
        case 'initialized':
          // send event as soon as viewer application in webview is ready
          console.log('command: initialize');
          this._onDidInitialize.fire({});
          break;
        case 'alert':
          window.showErrorMessage(message.text);
          break;
        case 'status':
          this.updateStatusbar(message.text);
          break;
        default:
          window.showErrorMessage(`JSCAD: unknown command: ${message.command}`);
      }
    }, null, this._disposables);
  }

  public updateStatusbar(status: string) {
    // Get the current text editor
    let editor = window.activeTextEditor;
    if (!editor) {
      this._statusBarItem.hide();
      return;
    }

    let doc = editor.document;

    // Only update status if a Markdown file
    if (doc.languageId === "javascript") {
      // Update the status bar
      this._statusBarItem.text = `JSCAD: ${status}`;
      this._statusBarItem.tooltip = 'JSCAD processor status';
      this._statusBarItem.command = 'jscadEditor.openPreview';
      this._statusBarItem.show();
    } else {
      this._statusBarItem.hide();
    }
  }

  public dispose() {
    JSCADPreviewPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();
    this._statusBarItem.dispose();
    this._onDidInitialize.dispose();

    // @TODO: cleanup othe resources    !

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * Set the JSCAD data inside the viewer.
   * @param data JSCAD code to be executed
   * @param fileName Filename shown inside the preview
   */
  public setJscadData(data: string, fileName?: string) {
    const displayName: string = fileName ? path.basename(fileName) : '';

    this._panel.webview.postMessage({ command: 'setData', data: { data, fileName } });
    this._panel.title = `Preview${fileName ? ` of ${displayName}` : ''}`;
    this._panel.iconPath = Uri.file(path.join(this._extensionPath, 'resources', 'Icon_View_3D.svg'));
  }

  private _update(state: any = {}) {
    this._panel.webview.html = this._getHtmlForWebview(state);
  }

  private _getHtmlForWebview(state: any = {}) {
    // Local path to main script run in the webview
    const jscadCoreScript = Uri.file(path.join(this._extensionPath, 'media', 'dist/jscad-web-opt.js'));
    const jscadEditorScript = Uri.file(path.join(this._extensionPath, 'media', 'main.mjs'));
    // const jscadEditorScript = Uri.file(path.join(this._extensionPath, 'media', 'jscad-editor-main.js'));
    const jscadEditorCSS = Uri.file(path.join(this._extensionPath, 'media', 'jscad-editor.css'));

    // And the uri we use to load this script in the webview
    const coreScriptUri = jscadCoreScript.with({ scheme: 'vscode-resource' });
    const editorScriptUri = jscadEditorScript.with({ scheme: 'vscode-resource' });
    const cssUri = jscadEditorCSS.with({ scheme: 'vscode-resource' });

    // Use a nonce to whitelist which scripts can be run (@FIXME: temporarily removed)
    const nonce = getNonce();

    // inject our configuration options via JSON (@FIXME: ugly, only works on hard reload of viewer panel)
    const options = {
      viewBackground: [],
    };

    return `<!DOCTYPE html>
    <html>
    <head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
    <title>OpenJSCAD.org Logo</title>
    <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';"> -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSCAD Preview</title>

    <link rel="stylesheet" href="${cssUri}" nonce="${nonce}" type="text/css">

    <!-- inject configuration via options object -->
    <script type="text/javascript">var config = ${JSON.stringify(options)};</script>
    </head>

    <body>
      <div class="jscad-container">
        <div id="header">
          <div id="errordiv"></div>
        </div>

        <div id="jscad-viewer-controls">
        <div class="jscad-viewer-button jscad-viewer-button-scene" data-action-viewport="scene" title="Reset to perspective view">
          <svg width="32px" height="32px" viewBox="0 0 128 128" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="3D" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <path d="M60,108.236068 L18,87.236068 L18,34.763932 L60,13.763932 L102,34.763932 L102,87.236068 L60,108.236068 Z" id="Background" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            <polygon id="Rectangle" fill="#FFFFFF" transform="translate(80.000000, 71.500000) scale(-1, 1) translate(-80.000000, -71.500000) " points="66 47 94 61 94 96 66 82"></polygon>
            <polygon id="Face_Top" fill="#FFFFFF" points="60 23 86 36 60 49 34 36"></polygon>
            <path d="M20.5,36.809017 L20.5,85.690983 L59.5,105.190983 L59.5,56.309017 L20.5,36.809017 Z" id="Face_Front" stroke="#FFFFFF"></path>
            <path d="M60,16.559017 L21.118034,36 L60,55.440983 L98.881966,36 L60,16.559017 Z" id="Face_Top" stroke="#FFFFFF"></path>
            <path d="M60.5,36.809017 L60.5,85.690983 L99.5,105.190983 L99.5,56.309017 L60.5,36.809017 Z" id="Face_Right" stroke="#FFFFFF" transform="translate(80.000000, 71.000000) scale(-1, 1) translate(-80.000000, -71.000000) "></path>
            <polygon id="Rectangle" fill="#FFFFFF" points="26 47 54 61 54 96 26 82"></polygon>
          </g>
          </svg>
        </div>
        <div class="jscad-viewer-button jscad-viewer-button-top" data-action-viewport="top" title="View from top (look down Z axis)">
          <svg width="32px" height="32px" viewBox="0 0 128 128" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="View_Top" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <path d="M60,108.236068 L18,87.236068 L18,34.763932 L60,13.763932 L102,34.763932 L102,87.236068 L60,108.236068 Z" id="Background" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M20.5,36.809017 L20.5,85.690983 L59.5,105.190983 L59.5,56.309017 L20.5,36.809017 Z" id="Face_Front" stroke="#FFFFFF"></path>
            <polygon id="Face_Top" fill="#FFFFFF" points="60 22 88 36 60 50 32 36"></polygon>
            <path d="M60.5,36.809017 L60.5,85.690983 L99.5,105.190983 L99.5,56.309017 L60.5,36.809017 Z" id="Face_Right" stroke="#FFFFFF" transform="translate(80.000000, 71.000000) scale(-1, 1) translate(-80.000000, -71.000000) "></path>
          </g>
          </svg>
        </div>
        <div class="jscad-viewer-button jscad-viewer-button-front" data-action-viewport="front" title="View from front (look along X axis)">
          <svg width="32px" height="32px" viewBox="0 0 128 128" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="View_Front" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <path d="M60,108.236068 L18,87.236068 L18,34.763932 L60,13.763932 L102,34.763932 L102,87.236068 L60,108.236068 Z" id="Background" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M20.5,36.809017 L20.5,85.690983 L59.5,105.190983 L59.5,56.309017 L20.5,36.809017 Z" id="Face_Front" stroke="#FFFFFF"></path>
            <path d="M60,16.559017 L21.118034,36 L60,55.440983 L98.881966,36 L60,16.559017 Z" id="Face_Top" stroke="#FFFFFF"></path>
            <path d="M60.5,36.809017 L60.5,85.690983 L99.5,105.190983 L99.5,56.309017 L60.5,36.809017 Z" id="Face_Right" stroke="#FFFFFF" transform="translate(80.000000, 71.000000) scale(-1, 1) translate(-80.000000, -71.000000) "></path>
            <polygon id="Rectangle" fill="#FFFFFF" points="26 47 54 61 54 96 26 82"></polygon>
          </g>
          </svg>
        </div>
        <div class="jscad-viewer-button jscad-viewer-button-left" data-action-viewport="left" title="View from left (look along Y axis)">
          <svg width="32px" height="32px" viewBox="0 0 128 128" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="View_Left" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <path d="M60,108.236068 L18,87.236068 L18,34.763932 L60,13.763932 L102,34.763932 L102,87.236068 L60,108.236068 Z" id="Background" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M20.5,36.809017 L20.5,85.690983 L59.5,105.190983 L59.5,56.309017 L20.5,36.809017 Z" id="Face_Front" stroke="#FFFFFF"></path>
            <path d="M60,16.559017 L21.118034,36 L60,55.440983 L98.881966,36 L60,16.559017 Z" id="Face_Top" stroke="#FFFFFF"></path>
            <path d="M60.5,36.809017 L60.5,85.690983 L99.5,105.190983 L99.5,56.309017 L60.5,36.809017 Z" id="Face_Right" stroke="#FFFFFF" transform="translate(80.000000, 71.000000) scale(-1, 1) translate(-80.000000, -71.000000) "></path>
            <polygon id="Rectangle" fill="#FFFFFF" transform="translate(80.000000, 71.500000) scale(-1, 1) translate(-80.000000, -71.500000) " points="66 47 94 61 94 96 66 82"></polygon>
          </g>
          </svg>
        </div>
        </div>

        <!-- setup display of the viewer, i.e. canvas -->
        <div id="viewerContext"></div>

        <!-- setup display of the status, as required by OpenJSCAD.js -->
        <div id="tail" style="display: none;">
          <div id="statusdiv"></div>
        </div>
      </div>

      <script nonce="${nonce}" src="${coreScriptUri}"></script>
      <!-- <script nonce="${nonce}" src="${editorScriptUri}"></script> -->
      <script nonce="${nonce}" type="module" src="${editorScriptUri}"></script>
    </body>

    </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

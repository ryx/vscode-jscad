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
    this._panel.iconPath = Uri.file(path.join(this._extensionPath, 'resources', 'Icon_View_Empty.svg'));
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
          <div class="jscad-viewer-button jscad-viewer-button-scene" data-action-viewport="scene" title="Reset to perspective view"></div>
          <div class="jscad-viewer-button jscad-viewer-button-top" data-action-viewport="top" title="View from top (look down Z axis)"></div>
          <div class="jscad-viewer-button jscad-viewer-button-front" data-action-viewport="front" title="View from front (look along X axis)"></div>
          <div class="jscad-viewer-button jscad-viewer-button-right" data-action-viewport="right" title="View from right (look along Y axis)"></div>
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

import * as path from 'path';
import {
  window,
  Disposable,
  StatusBarItem,
  StatusBarAlignment,
  Uri,
  ViewColumn,
  WebviewPanel,
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

  private _statusBarItem: StatusBarItem =  window.createStatusBarItem(StatusBarAlignment.Left);

  public static createOrShow(extensionPath: string) {
      const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

      // If we already have a panel, show it.
      if (JSCADPreviewPanel.currentPanel) {
          JSCADPreviewPanel.currentPanel._panel.reveal(column);
          return;
      }

      // Otherwise, create a new panel.
      const panel = window.createWebviewPanel(JSCADPreviewPanel.viewType, "JSCAD Preview", column || ViewColumn.Two, {
          // Enable javascript in the webview
          enableScripts: true,

          // And restric the webview to only loading content from our extension's `media` directory.
          /* localResourceRoots: [
              Uri.file(path.join(extensionPath, 'media'))
          ] */
      });

      JSCADPreviewPanel.currentPanel = new JSCADPreviewPanel(panel, extensionPath);
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

  public static revive(panel: WebviewPanel, extensionPath: string) {
      JSCADPreviewPanel.currentPanel = new JSCADPreviewPanel(panel, extensionPath);
  }

  private constructor(
      panel: WebviewPanel,
      extensionPath: string
  ) {
      this._panel = panel;
      this._extensionPath = extensionPath;

      // Set the webview's initial html content
      this._update();

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
        switch (message.command) {
            case 'initialized':
                // this._update();
                // @TODO: update according to editor contents
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

  public dispose() {
      JSCADPreviewPanel.currentPanel = undefined;

      // Clean up our resources
      this._panel.dispose();
      this._statusBarItem.dispose();

      // @TODO: cleanup webview!

      while (this._disposables.length) {
          const x = this._disposables.pop();
          if (x) {
              x.dispose();
          }
      }
  }

  public onDidInitialize() {

  }

  /**
   * Set the JSCAD data inside the viewer.
   * @param data JSCAD code to be executed
   */
  public setJscadData(data: string) {
      this._panel.webview.postMessage({ command: 'setData', data });
  }

  private _update() {
      this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview() {

      // Local path to main script run in the webview
      const jscadCoreScript = Uri.file(path.join(this._extensionPath, 'media', 'dist/jscad-web-opt.js'));
      const jscadEditorScript = Uri.file(path.join(this._extensionPath, 'media', 'jscad-editor-main.js'));
      const jscadEditorCSS = Uri.file(path.join(this._extensionPath, 'media', 'jscad-editor.css'));

      // And the uri we use to load this script in the webview
      const coreScriptUri = jscadCoreScript.with({ scheme: 'vscode-resource' });
      const editorScriptUri = jscadEditorScript.with({ scheme: 'vscode-resource' });
      const cssUri = jscadEditorCSS.with({ scheme: 'vscode-resource' });

      // Use a nonce to whitelist which scripts can be run
      const nonce = getNonce();

      return `<!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
        <title>OpenJSCAD.org Logo</title>
        <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';"> -->
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JSCAD Preview</title>

        <link rel="stylesheet" href="${cssUri}" nonce="${nonce}" type="text/css">
      </head>

      <body>
          <div class="jscad-container">
              <div id="header">
                  <div id="errordiv"></div>
              </div>

              <!-- setup display of the viewer, i.e. canvas -->
              <div id="viewerContext"></div>

              <!-- setup display of the status, as required by OpenJSCAD.js -->
              <div id="tail" style="display: block;">
                  <div id="statusdiv"></div>
              </div>
          </div>

          <script nonce="${nonce}" src="${coreScriptUri}"></script>
          <script nonce="${nonce}" src="${editorScriptUri}"></script>
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

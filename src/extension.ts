import * as vscode from 'vscode';
import JSCADEditorController from './JSCADEditorController';
import JSCADPreviewPanel from './JSCADPreviewPanel';
import JSCADExporter from './JSCADExporter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('vscode-jscad-editor active');

  // create and register our editor controller
  const controller = new JSCADEditorController();
  context.subscriptions.push(controller);

  // create our exporter (@TODO: dispose)
  const exporter = new JSCADExporter(context.extensionPath);

  // add commands
  context.subscriptions.push(vscode.commands.registerCommand('jscadEditor.openPreview', () => {
    const panel = JSCADPreviewPanel.createOrShow(context.extensionPath);
    panel.onDidInitialize(() => {
      vscode.window.showInformationMessage('JSCAD Viewer initialized!');
      controller.updatePanelWithEditorData();
    });
  }));

  context.subscriptions.push(vscode.commands.registerCommand('jscadEditor.exportAsSTL', async () => {
    // get active editor
    const editor = vscode.window.activeTextEditor;
    // check if file is really a *.jscad file
    if (editor && editor.document.fileName.match(/\.jscad$/i)) {
      // TODO: open file selection dialog and get desired output name
      // export it to desired format
      exporter.command(`npx openjscad ${editor.document.fileName}`);
    }
  }));

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serilizer in activation event
    vscode.window.registerWebviewPanelSerializer(JSCADPreviewPanel.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        console.log(`Got state: ${state}`);
        JSCADPreviewPanel.revive(webviewPanel, context.extensionPath);
        // @TODO: store/restore viewwport coordinates as JSON object
      }
    });
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
}

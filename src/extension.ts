import * as vscode from 'vscode';
import JSCADEditorController from './JSCADEditorController';
import JSCADPreviewPanel from './JSCADPreviewPanel';
import JSCADExporter from './JSCADExporter';
import JSCADIntellisenseProvider from './JSCADIntellisenseProvider';
import ImportPathFromSVGAction from './actions/ImportPathFromSVGAction';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('vscode-jscad-editor active');

  // create and register our editor controller
  const controller = new JSCADEditorController();
  context.subscriptions.push(controller);

  // create our exporter (@TODO: dispose)
  const exporter = new JSCADExporter(context.extensionPath);

  // register our custom intellisense provider
  new JSCADIntellisenseProvider();

  // add commands
  context.subscriptions.push(vscode.commands.registerCommand('jscadEditor.openPreview', () => {
    console.log('jscadEditor.openPreview: command runs');
    JSCADPreviewPanel.createOrShow(context.extensionPath);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('jscadEditor.exportAsSTL', async () => {
    // @NOTE: I am unsure whether this should be a Task instead. We are actually building something
    // but on the other hand this is just a simple export :-| ... should check how other extensions
    // solve this (e.g. less/sass, etc)

    // get active editor
    const editor = vscode.window.activeTextEditor;
    // check if file is really a *.jscad file
    if (editor && editor.document.fileName.match(/\.jscad$/i)) {
      // TODO: open file selection dialog and get desired output name
      // export it to desired format
      const result = await exporter.command(`npx openjscad "${editor.document.fileName}"`);
      if (result) {
        vscode.window.showInformationMessage('JSCAD: STL export succeeded');
      } else {
        vscode.window.showErrorMessage('JSCAD: STL export failed (check task output for details)');
      }
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('jscadEditor.importPathFromSVG', async () => {
    // get active editor
    const editor = vscode.window.activeTextEditor;
    // check if file is really a *.jscad file
    if (editor && editor.document.fileName.match(/\.jscad$/i)) {
      // open file selection dialog and locate SVG file
      const selectedFiles = await vscode.window.showOpenDialog({
        filters: {
          'SVG files': ['svg']
        },
      });
      if (selectedFiles && selectedFiles.length > 0) {
        const importer = new ImportPathFromSVGAction(selectedFiles[0].fsPath);
        const polygonElements = importer.getPolygonsFromSVG(); 
        if (!polygonElements) {
          vscode.window.showErrorMessage('No <polygon> element found in provided SVG document');
          return;
        }
        /*
        if (polygonElements.length > 1) {
          // show selection list, when multiple paths available
          const elementName = await vscode.window.showQuickPick(['ghi', 'hghgc', '76tz', 'edfghvjb'], {
            placeHolder: 'Choose SVG path object to import'
          });
        }
        */
        const svgString = importer.convertSVGPolygonToJSCADString(polygonElements);
        if (!svgString) {
          vscode.window.showErrorMessage('Failed to comvert <polygon> element to JSCAD. See error output for details.');
          return;
        }
        editor.insertSnippet(new vscode.SnippetString(svgString));
      }
    }
  }));

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serilizer in activation event
    vscode.window.registerWebviewPanelSerializer(JSCADPreviewPanel.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        console.log(`JSCADPreview activate: restore state ${state}`);
        const panel = JSCADPreviewPanel.revive(webviewPanel, context.extensionPath, state);
        panel.onDidInitialize(e => {
          console.log('INIT DONE');
          vscode.window.showInformationMessage('JSCAD Viewer initialized!');
          controller.updatePanelWithEditorData();
        });
      }
    });
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
}

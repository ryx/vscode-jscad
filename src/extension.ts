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

  // add intellisense
  const completionItems:vscode.CompletionItem[] = [
    {
      label: 'cube',
      detail: `@param {object} options Object with options for this cube`,
      documentation: 'Create a cube',
      kind: vscode.CompletionItemKind.Function
    },
    { label: 'cylinder', documentation: 'A cylinder' },
    { label: 'rotate', documentation: 'Rotate the object according to given vector (expects array with vector)' },
    { label: 'rotateX', documentation: 'Rotate the object around the X axis (expects number)' },
    { label: 'rotateY', documentation: 'Rotate the object around the Y axis (expects number)' },
    { label: 'rotateZ', documentation: 'Rotate the object around the Z axis (expects number)' },
    { label: 'sphere', documentation: 'Create a sphere' },
    { label: 'translate', documentation: 'Move the object according to given vector (expects array)' },
  ];
  vscode.languages.registerCompletionItemProvider({
    language: 'javascript',
   }, {
    provideCompletionItems(document, position, token, context) {
      return completionItems;
    },

    resolveCompletionItem(item:vscode.CompletionItem, token) {
      const extendedItems = completionItems.filter(extendedItem => extendedItem.label === item.label);
      if (extendedItems.length > 0) {
        return extendedItems[0];
      }
    }
  });

  // add commands
  context.subscriptions.push(vscode.commands.registerCommand('jscadEditor.openPreview', () => {
    console.log('jscadEditor.openPreview: command runs');
    JSCADPreviewPanel.createOrShow(context.extensionPath);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('jscadEditor.exportAsSTL', async () => {
    // @NOTE: I am unsure whether this should be a Task instead. We are actually bulding something
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

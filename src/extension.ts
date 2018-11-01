import * as vscode from 'vscode';
import JSCADEditorController from './JSCADEditorController';
import JSCADPreviewPanel from './JSCADPreviewPanel';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('vscode-jscad-editor active');

    context.subscriptions.push(vscode.commands.registerCommand('jscadEditor.openPreview', () => {
        JSCADPreviewPanel.createOrShow(context.extensionPath);
    }));

    if (vscode.window.registerWebviewPanelSerializer) {
        // Make sure we register a serilizer in activation event
        vscode.window.registerWebviewPanelSerializer(JSCADPreviewPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                console.log(`Got state: ${state}`);
                JSCADPreviewPanel.revive(webviewPanel, context.extensionPath);
            }
        });
    }

    // create and register our editor controller
    const controller = new JSCADEditorController();
    context.subscriptions.push(controller);
}

// this method is called when your extension is deactivated
export function deactivate() {
}


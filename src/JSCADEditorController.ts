import {
  window,
  languages,
  DiagnosticSeverity,
  Disposable,
  TextEditor,
} from 'vscode';
import { debounce } from 'debounce';
import JSCADPreviewPanel from './JSCADPreviewPanel';

/**
 * Checks for changes in the edited file and updates the view tab accordingly.
 */
export default class JSCADEditorController {

  private _disposable: Disposable;
  public updatePanelWithEditorData: (() => void) & {
    clear(): void;
  };

  constructor() {
    // subscribe to selection change and editor activation events
    let subscriptions: Disposable[] = [];
    window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
    window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

    // create a combined disposable from both event subscriptions
    this._disposable = Disposable.from(...subscriptions);

    // add debouncing to viewer update
    this.updatePanelWithEditorData = debounce(this._updatePanelWithEditorData, 500);
  }

  private _updatePanelWithEditorData() {
    const panel = JSCADPreviewPanel.currentPanel;
    if (panel) {
      const editor = window.activeTextEditor;
      if (editor) {
        const fileName = editor.document.fileName;
        // @FIXME: use proper filename lookup pattern from config instead
        if (fileName.match(/\.jscad$/i)) {
          if (this._editorHasError(editor)) {
            window.showErrorMessage('Not updating because of code error');
          } else {
            panel.setJscadData(editor.document.getText(), fileName);
          }
        }
      }
    }
    // this.updatePanelWithEditorData.clear();
  }

  dispose() {
    this._disposable.dispose();
  }

  private _editorHasError(editor: TextEditor) {
    const diagnostics = languages.getDiagnostics(editor.document.uri);
    return diagnostics.filter(d => d.severity === DiagnosticSeverity.Error).length > 0;
  }

  private _onEvent() {
    this.updatePanelWithEditorData();
  }
}

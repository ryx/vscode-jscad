import {
  window,
  languages,
  DiagnosticSeverity,
  Disposable,
  TextEditor,
} from 'vscode';
import JSCADPreviewPanel from './JSCADPreviewPanel';

/**
 * Checks for changes in the edited file and updates the view tab accordingly.
 */
export default class JSCADEditorController {

  private _disposable: Disposable;

  constructor() {
    // subscribe to selection change and editor activation events
    let subscriptions: Disposable[] = [];
    window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
    window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

    // initially update the view
    // this._onEvent();

    // create a combined disposable from both event subscriptions
    this._disposable = Disposable.from(...subscriptions);
  }

  dispose() {
    this._disposable.dispose();
  }

  private _editorHasError(editor: TextEditor) {
    const diagnostics = languages.getDiagnostics(editor.document.uri);
    const errorList = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);

    // @HACK: ignore single stylelint error showing up for some strange reason
    // see https://github.com/stylelint/stylelint/issues/3434
    if ((errorList.length === 1 && errorList[0].source === 'stylelint')) {
      return false;
    }

    return errorList.length > 0;
  }

  private _onEvent() {
    const panel = JSCADPreviewPanel.currentPanel;
    if (panel) {
      const editor = window.activeTextEditor;
      if (editor) {
        if (this._editorHasError(editor)) {
          window.showErrorMessage('Not updating because of code error');
        } else {
          panel.setJscadData(editor.document.getText());
        }
      }
    }
  }
}

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

  private _currentJSCADFileName: string = '';
  private _previousJSCADEditor: TextEditor | undefined;
  private _disposable: Disposable;
  public updatePanelWithEditorData: (() => void) & {
    clear(): void;
  };

  constructor() {
    // subscribe to selection change and editor activation events
    let subscriptions: Disposable[] = [];
    window.onDidChangeTextEditorSelection(this._onDidChangeTextEditorSelection, this, subscriptions);
    window.onDidChangeActiveTextEditor(this._onDidChangeActiveTextEditor, this, subscriptions);

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
        } else {
          // do we have a currently open filename?
          console.log('JSCADEditorController._updatePanelWithEditorData: no matching fileName found');
          console.log('this._currentJSCADFileName is ', this._currentJSCADFileName);
        }
      } else {
        console.log('JSCADEditorController._updatePanelWithEditorData: no matching editor');
        console.log('this._currentJSCADFileName is ', this._currentJSCADFileName);
        // do we have a previously open editor? 
        if (this._previousJSCADEditor) {
          panel.setJscadData(this._previousJSCADEditor.document.getText(), this._currentJSCADFileName);
        }
      }
    }
  }

  dispose() {
    this._disposable.dispose();
    // this.updatePanelWithEditorData.clear();
  }

  private _editorHasError(editor: TextEditor) {
    const diagnostics = languages.getDiagnostics(editor.document.uri);
    return diagnostics.filter(d => d.severity === DiagnosticSeverity.Error).length > 0;
  }

  private _onDidChangeTextEditorSelection() {
    console.log('JSCADEditorController._onDidChangeActiveTextEditor');
    this.updatePanelWithEditorData();
  }

  private _onDidChangeActiveTextEditor() {
    console.log('JSCADEditorController._onDidChangeActiveTextEditor');
    this.updatePanelWithEditorData();
    // remember current file
    const editor = window.activeTextEditor;
    if (editor) {
      const fileName = editor.document.fileName;
      if (fileName.match(/\.jscad$/i)) {
        console.log('JSCADEditorController._onDidChangeActiveTextEditor: JSCAD filename is ', fileName);
        this._currentJSCADFileName = fileName;
        this._previousJSCADEditor = editor;
        this.updatePanelWithEditorData();
      }
    }
  }
}

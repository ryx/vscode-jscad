import {
  languages,
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  TextDocument,
  Position,
  CancellationToken,
  CompletionContext,
  SignatureHelp,
} from "vscode";

export default class JSCADIntellisenseProvider implements CompletionItemProvider {
  private completionItems:CompletionItem[] = [
    {
      label: 'cube',
      detail: `@param {object} options Object with options for this cube`,
      documentation: 'Create a cube',
      kind: CompletionItemKind.Function
    },
    { label: 'cylinder', documentation: 'A cylinder' },
    { label: 'rotate', documentation: 'Rotate the object according to given vector (expects array with vector)' },
    { label: 'rotateX', documentation: 'Rotate the object around the X axis (expects number)' },
    { label: 'rotateY', documentation: 'Rotate the object around the Y axis (expects number)' },
    { label: 'rotateZ', documentation: 'Rotate the object around the Z axis (expects number)' },
    { label: 'sphere', documentation: 'Create a sphere' },
    { label: 'translate', documentation: 'Move the object according to given vector (expects array)' },
  ];

  constructor() {
    languages.registerCompletionItemProvider({
      language: 'javascript',
    }, this);

    /*
    languages.registerHoverProvider('javascript', {
      provideHover(document: TextDocument, position: Position, token: CancellationToken) {
        return new Hover('I am a hover!');
      }
    });
    */

    languages.registerSignatureHelpProvider('javascript', {
      provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken) {
        const help = new SignatureHelp();
        help.signatures = [
          { label: 'cube', documentation: 'Create new cube', parameters: [
              { label: 'x:string', documentation: 'x position' },
              { label: 'y:string', documentation: 'y position' },
              { label: 'z:string', documentation: 'z position' },
            ] ,
          }
        ];
        return help;
      }
    }, '(');
  }

  public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) {
    return this.completionItems;
  }

  public resolveCompletionItem(item:CompletionItem, token: CancellationToken) {
    const extendedItems = this.completionItems.filter(extendedItem => extendedItem.label === item.label);
    if (extendedItems.length > 0) {
      return extendedItems[0];
    }
  }
}

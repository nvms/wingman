import * as vscode from "vscode";

const myScheme = "my-diff";
const myProvider = {
  provideTextDocumentContent(uri) {
    return Buffer.from(uri.query, "base64").toString();
  }
};

vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider);

export const createDiff = (text1: string, text2: string, languageId?: string) => {
  const uri1 = vscode.Uri.parse(`${myScheme}:/original?${Buffer.from(text1).toString("base64")}`);
  const uri2 = vscode.Uri.parse(`${myScheme}:/suggestion?${Buffer.from(text2).toString("base64")}`);

vscode.workspace.openTextDocument(uri1).then((doc1) => {
    vscode.workspace.openTextDocument(uri2).then((doc2) => {
      if (languageId) {
        vscode.languages.setTextDocumentLanguage(doc1, languageId);
        vscode.languages.setTextDocumentLanguage(doc2, languageId);
      }

      vscode.commands.executeCommand("vscode.diff", doc1.uri, doc2.uri);
    });
  });

  vscode.commands.executeCommand("vscode.diff", uri1, uri2);
};


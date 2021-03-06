import vscode from 'vscode';
import * as state from './state';
import * as util from './utilities';
import evaluate from './repl/middleware/evaluate';
import annotations from './providers/annotations';
import select from './repl/middleware/select';
import shadow from './shadow';

const CONNECT_SHADOW_CLJS_CLJ_SERVER_REPL = 'npx shadow-cljs clj-repl';
const CONNECT_SHADOW_CLJS_CLJS_REPL = 'npx shadow-cljs cljs-repl';

function terminalSlug(sessionSlug) {
    return sessionSlug + '-terminal';
}

function createREPLTerminal(sessionType, shadowBuild, outputChan) {
    let current = state.deref(),
        slug = terminalSlug(sessionType),
        terminalName = (sessionType === 'clj' ? 'Clojure' : 'CojureScript') + ' REPL',
        terminal = null;

    if (current.get(slug)) {
        current.get(slug).dispose();
    }
    terminal = vscode.window.createTerminal(terminalName);

    if (terminal) {
        state.cursor.set(slug, terminal);
        let connectCommand = shadow.isShadowCljs() ?
            (sessionType === 'cljs' ?
                `${CONNECT_SHADOW_CLJS_CLJS_REPL} ${shadowBuild}` :
                CONNECT_SHADOW_CLJS_CLJ_SERVER_REPL) :
            state.config().connectREPLCommand + " " + current.get('hostname') + ':' + current.get('port');
        terminal.sendText(connectCommand);
        if (!shadowBuild && sessionType === 'cljs') {
            terminal.sendText(util.getCljsReplStartCode());
        }
        outputChan.appendLine('Terminal created for: ' + terminalName);
    }
}

function openREPLTerminal(keepFocus = true) {
    let current = state.deref(),
        chan = current.get('outputChannel'),
        sessionType = util.getREPLSessionType(),
        terminal = current.get(terminalSlug(sessionType));

    if (terminal) {
        terminal.show(keepFocus);
    }
    else {
        chan.appendLine("No REPL terminal found. Try reconnecting the REPL sessions.");
    }
}

function openREPLTerminalCommand() {
    openREPLTerminal(false);
}

function loadNamespace() {
    setREPLNamespace(true, false);
}

function loadNamespaceCommand() {
    let terminal = state.deref().get(terminalSlug(util.getREPLSessionType()));
    if (terminal) {
        terminal.show();
        loadNamespace();
    }
}

function sendTextToREPLTerminal(text, addNewline = false) {
    let current = state.deref(),
        chan = current.get('outputChannel'),
        sessionType = util.getREPLSessionType(),
        terminal = current.get(terminalSlug(sessionType));

    if (terminal) {
        terminal.sendText(text, addNewline);
    }
    else {
        chan.appendLine("No REPL terminal found. Try reconnecting the REPL sessions.");
    }
}

function setREPLNamespace(reload = false, keepFocus = true) {
    let nameSpace = util.getDocumentNamespace();

    if (reload) {
        evaluate.evaluateFile();
    }
    sendTextToREPLTerminal("(in-ns '" + nameSpace + ")", true);
    openREPLTerminal(keepFocus);
}

function setREPLNamespaceCommand() {
    let terminal = state.deref().get(terminalSlug(util.getREPLSessionType()));
    if (terminal) {
        terminal.show();
        setREPLNamespace(false, false);
    }
}

function evalCurrentFormInREPLTerminal(keepFocus = true, topLevel = false) {
    let editor = vscode.window.activeTextEditor,
        doc = util.getDocument({}),
        selection = editor.selection,
        codeSelection = null,
        code = "";

    annotations.clearEvaluationDecorations(editor);
    if (selection.isEmpty) {
        codeSelection = select.getFormSelection(doc, selection.active, topLevel);
        annotations.decorateSelection(codeSelection, editor);
        code = doc.getText(codeSelection);
    } else {
        codeSelection = selection;
        code = doc.getText(selection);
    }
    if (code !== "") {
        sendTextToREPLTerminal(code, true)
    }
    openREPLTerminal(keepFocus);
}

function evalCurrentFormInREPLTerminalCommand() {
    evalCurrentFormInREPLTerminal(false);
}

function evalCurrentTopLevelFormInREPLTerminalCommand() {
    evalCurrentFormInREPLTerminal(false, true);
}

export default {
    createREPLTerminal,
    openREPLTerminal,
    openREPLTerminalCommand,
    loadNamespace,
    loadNamespaceCommand,
    setREPLNamespace,
    setREPLNamespaceCommand,
    evalCurrentFormInREPLTerminal,
    evalCurrentFormInREPLTerminalCommand,
    evalCurrentTopLevelFormInREPLTerminalCommand
};
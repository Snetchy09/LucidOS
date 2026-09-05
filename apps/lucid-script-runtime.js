class LucidScriptError extends Error {
    constructor(message, line = null) {
        super(line ? `Line ${line}: ${message}` : message);
        this.name = "LucidScriptError";
        this.line = line;
    }
}

class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.values = new Map();
    }

    define(name, value) { this.values.set(name, value); }
    hasLocal(name) { return this.values.has(name); }
    has(name) { return this.values.has(name) || (this.parent ? this.parent.has(name) : false); }
    get(name) {
        if (this.values.has(name)) return this.values.get(name);
        if (this.parent) return this.parent.get(name);
        throw new LucidScriptError(`Variable "${name}" does not exist.`);
    }
    set(name, value) {
        if (this.values.has(name)) { this.values.set(name, value); return; }
        if (this.parent && this.parent.has(name)) { this.parent.set(name, value); return; }
        throw new LucidScriptError(`Variable "${name}" does not exist.`);
    }
}

function tokenize(source) {
    const tokens = [];
    let index = 0;
    let line = 1;

    function add(type, value, tokenLine = line) {
        tokens.push({ type, value, line: tokenLine });
    }

    while (index < source.length) {
        const char = source[index];

        if (char === "\n") {
            add("newline", "\n", line);
            index++; line++; continue;
        }
        if (char === "\r") { index++; continue; }
        if (char === " " || char === "\t") { index++; continue; }
        if (char === "/" && source[index + 1] === "/") {
            while (index < source.length && source[index] !== "\n") index++;
            continue;
        }

        if (char === '"' || char === "'") {
            const quote = char;
            const startLine = line;
            let value = "";
            index++;
            while (index < source.length) {
                const current = source[index];
                if (current === quote && source[index - 1] !== "\\") { index++; break; }
                if (current === "\n") line++;
                if (current === "\\" && source[index + 1]) {
                    const next = source[index + 1];
                    if (next === "n") { value += "\n"; index += 2; continue; }
                    if (next === "t") { value += "\t"; index += 2; continue; }
                    if (next === "\\" || next === '"' || next === "'") { value += next; index += 2; continue; }
                }
                value += current;
                index++;
            }
            add("string", value, startLine);
            continue;
        }

        if (/[0-9]/.test(char)) {
            const start = index;
            const tokenLine = line;
            while (index < source.length && /[0-9.]/.test(source[index])) index++;
            const raw = source.slice(start, index);
            const value = Number(raw);
            if (!Number.isFinite(value)) throw new LucidScriptError(`Invalid number "${raw}".`, tokenLine);
            add("number", value, tokenLine);
            continue;
        }

        if (/[A-Za-z_]/.test(char)) {
            const start = index;
            const tokenLine = line;
            while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) index++;
            add("identifier", source.slice(start, index), tokenLine);
            continue;
        }

        const two = source.slice(index, index + 2);
        if (["==", "!=", ">=", "<=", "&&", "||"].includes(two)) {
            add("operator", two);
            index += 2;
            continue;
        }

        if (["{", "}", "(", ")", "[", "]", ",", ":", ".", "=", "+", "-", "*", "/", "%", ">", "<", "!"].includes(char)) {
            add(["=", "+", "-", "*", "/", "%", ">", "<", "!"].includes(char) ? "operator" : "symbol", char);
            index++;
            continue;
        }

        throw new LucidScriptError(`Unexpected character "${char}".`, line);
    }

    tokens.push({ type: "eof", value: "", line });
    return tokens;
}

class Parser {
    constructor(source) {
        this.tokens = tokenize(source);
        this.index = 0;
    }

    current() { return this.tokens[this.index] || this.tokens[this.tokens.length - 1]; }
    previous() { return this.tokens[this.index - 1] || null; }
    advance() {
        const token = this.current();
        if (token.type !== "eof") this.index++;
        return token;
    }

    check(type, value = null) {
        const token = this.current();
        if (token.type !== type) return false;
        if (value !== null && token.value !== value) return false;
        return true;
    }

    matchSymbol(symbol) {
        if (this.check("symbol", symbol)) { this.advance(); return true; }
        return false;
    }

    matchOperator(operator) {
        if (this.check("operator", operator)) { this.advance(); return true; }
        return false;
    }

    expectSymbol(symbol, message = null) {
        if (this.matchSymbol(symbol)) return;
        const token = this.current();
        throw new LucidScriptError(message || `Expected "${symbol}".`, token.line);
    }

    expectIdentifier(message = null) {
        const token = this.current();
        if (token.type !== "identifier") throw new LucidScriptError(message || "Expected a name.", token.line);
        this.advance();
        return token;
    }

    skipNewlines() { while (this.check("newline")) this.advance(); }
    consumeLineEnd() { while (this.check("newline")) this.advance(); }

    parse() {
        const program = this.parseBlock(false);
        this.skipNewlines();
        if (!this.check("eof")) {
            const token = this.current();
            throw new LucidScriptError(`Unexpected "${token.value}".`, token.line);
        }
        return program;
    }

    parseBlock(insideBraces) {
        const nodes = [];
        this.skipNewlines();
        while (!this.check("eof")) {
            if (insideBraces && this.check("symbol", "}")) { this.advance(); return nodes; }
            if (!insideBraces && this.check("symbol", "}")) throw new LucidScriptError("Unexpected closing brace.", this.current().line);
            nodes.push(this.parseStatement());
            this.skipNewlines();
        }
        if (insideBraces) throw new LucidScriptError("Missing closing brace.");
        return nodes;
    }

    parseStatement() {
        const token = this.current();
        if (token.type !== "identifier") throw new LucidScriptError(`Expected a command, found "${token.value}".`, token.line);
        const command = token.value;
        this.advance();

        switch (command) {
            case "app": return { type: "app", value: this.parseExpressionLine(), line: token.line };
            case "window": return { type: "window", children: this.parseRequiredBlock(token.line), line: token.line };
            case "title": return { type: "title", value: this.parseExpressionLine(), line: token.line };
            case "text": return { type: "text", value: this.parseExpressionLine(), line: token.line };
            case "button": {
                const value = this.parseExpressionUntilBlock();
                const children = this.parseRequiredBlock(token.line);
                return { type: "button", value, children, line: token.line };
            }
            case "onClick": return { type: "onClick", children: this.parseRequiredBlock(token.line), line: token.line };
            case "let": {
                const name = this.expectIdentifier("Expected a variable name after 'let'.");
                this.expectOperator("=");
                const value = this.parseExpressionLine();
                return { type: "let", name: name.value, value, line: token.line };
            }
            case "set": {
                const name = this.expectIdentifier("Expected a variable name after 'set'.");
                this.expectOperator("=");
                const value = this.parseExpressionLine();
                return { type: "set", name: name.value, value, line: token.line };
            }
            case "if": {
                const condition = this.parseExpressionUntilBlock();
                const children = this.parseRequiredBlock(token.line);
                this.skipNewlines();
                let elseChildren = null;
                if (this.check("identifier", "else")) {
                    this.advance();
                    elseChildren = this.parseRequiredBlock(token.line);
                }
                return { type: "if", condition, children, elseChildren, line: token.line };
            }
            case "repeat": {
                const count = this.parseExpressionUntilBlock();
                const children = this.parseRequiredBlock(token.line);
                return { type: "repeat", count, children, line: token.line };
            }
            case "each": {
                const variable = this.expectIdentifier("Expected a variable name after 'each'.");
                if (!this.check("identifier", "in")) throw new LucidScriptError("Expected 'in' after the each variable.", this.current().line);
                this.advance();
                const collection = this.parseExpressionUntilBlock();
                const children = this.parseRequiredBlock(token.line);
                return { type: "each", variable: variable.value, collection, children, line: token.line };
            }
            case "function": {
                const name = this.expectIdentifier("Expected a function name.");
                const parameters = [];
                if (this.matchSymbol("(")) {
                    while (!this.check("symbol", ")")) {
                        const parameter = this.expectIdentifier("Expected a parameter name.");
                        parameters.push(parameter.value);
                        if (!this.matchSymbol(",")) break;
                    }
                    this.expectSymbol(")");
                }
                const body = this.parseRequiredBlock(token.line);
                return { type: "function", name: name.value, parameters, body, line: token.line };
            }
            case "return": return { type: "return", value: this.parseExpressionLine(), line: token.line };
            case "else": throw new LucidScriptError("'else' must come immediately after an 'if'.", token.line);
            default: {
                const expression = this.parseExpressionAfterIdentifier(command);
                return { type: "expression", expression, line: token.line };
            }
        }
    }

    parseRequiredBlock(line) {
        this.skipNewlines();
        this.expectSymbol("{", "Expected '{' to open a block.");
        return this.parseBlock(true);
    }

    expectOperator(operator) {
        if (this.matchOperator(operator)) return;
        const token = this.current();
        throw new LucidScriptError(`Expected "${operator}".`, token.line);
    }

    parseExpressionLine() { return this.parseExpression({ stopAtNewline: true, stopAtBlock: true }); }
    parseExpressionUntilBlock() { return this.parseExpression({ stopAtNewline: false, stopAtBlock: true }); }

    parseExpressionAfterIdentifier(identifier) {
        const first = { type: "identifier", value: identifier, line: this.previous()?.line || this.current().line };
        return this.parseExpressionWithFirst(first);
    }

    parseExpression(options = {}) { return this.parseBinaryExpression(0, options); }
    parseExpressionWithFirst(first) { return this.parseBinaryExpressionWithFirst(0, first); }

    getPrecedence(operator) {
        switch (operator) {
            case "||": return 1;
            case "&&": return 2;
            case "==": case "!=": return 3;
            case ">": case "<": case ">=": case "<=": return 4;
            case "+": case "-": return 5;
            case "*": case "/": case "%": return 6;
            default: return -1;
        }
    }

    parseBinaryExpression(minimumPrecedence, options) {
        let left = this.parseUnary(options);
        while (this.isExpressionOperator(options)) {
            const token = this.current();
            const precedence = this.getPrecedence(token.value);
            if (precedence < minimumPrecedence) break;
            this.advance();
            const right = this.parseBinaryExpression(precedence + 1, options);
            left = { type: "binary", operator: token.value, left, right, line: token.line };
        }
        return left;
    }

    parseBinaryExpressionWithFirst(minimumPrecedence, first) {
        let left = this.makePrimaryFromIdentifier(first);
        while (this.isExpressionOperator({ stopAtNewline: true, stopAtBlock: true })) {
            const token = this.current();
            const precedence = this.getPrecedence(token.value);
            if (precedence < minimumPrecedence) break;
            this.advance();
            const right = this.parseBinaryExpression(precedence + 1, { stopAtNewline: true, stopAtBlock: true });
            left = { type: "binary", operator: token.value, left, right, line: token.line };
        }
        return left;
    }

    isExpressionOperator(options) {
        const token = this.current();
        if (token.type !== "operator") return false;
        if (options.stopAtNewline && token.value === "\n") return false;
        return this.getPrecedence(token.value) >= 0;
    }

    parseUnary(options) {
        const token = this.current();
        if (token.type === "operator" && (token.value === "!" || token.value === "-")) {
            this.advance();
            return { type: "unary", operator: token.value, value: this.parseUnary(options), line: token.line };
        }
        return this.parsePrimary(options);
    }

    parsePrimary(options) {
        const token = this.current();

        if (token.type === "number") {
            this.advance();
            return { type: "literal", value: token.value, line: token.line };
        }
        if (token.type === "string") {
            this.advance();
            return { type: "literal", value: token.value, line: token.line };
        }
        if (token.type === "identifier") {
            this.advance();
            return this.makePrimaryFromIdentifier(token);
        }
        if (this.matchSymbol("(")) {
            const expression = this.parseExpression({ stopAtNewline: false, stopAtBlock: false });
            this.expectSymbol(")");
            return expression;
        }
        if (this.matchSymbol("[")) {
            const items = [];
            this.skipNewlines();
            while (!this.check("symbol", "]")) {
                items.push(this.parseExpression({ stopAtNewline: true, stopAtBlock: false }));
                this.skipNewlines();
                if (!this.matchSymbol(",")) break;
                this.skipNewlines();
            }
            this.expectSymbol("]");
            return { type: "array", items, line: token.line };
        }
        if (this.matchSymbol("{")) {
            const properties = [];
            this.skipNewlines();
            while (!this.check("symbol", "}")) {
                const key = this.expectIdentifier("Expected an object property name.");
                this.expectSymbol(":");
                const value = this.parseExpression({ stopAtNewline: true, stopAtBlock: false });
                properties.push({ key: key.value, value });
                this.skipNewlines();
                if (!this.matchSymbol(",")) { this.skipNewlines(); continue; }
                this.skipNewlines();
            }
            this.expectSymbol("}");
            return { type: "object", properties, line: token.line };
        }
        throw new LucidScriptError(`Unable to understand "${token.value}".`, token.line);
    }

    makePrimaryFromIdentifier(token) {
        let expression = { type: "identifier", name: token.value, line: token.line };
        while (true) {
            if (this.matchSymbol(".")) {
                const property = this.expectIdentifier("Expected a property name after '.'.");
                expression = { type: "member", object: expression, property: property.value, line: token.line };
                continue;
            }
            if (this.matchSymbol("(")) {
                const args = [];
                this.skipNewlines();
                while (!this.check("symbol", ")")) {
                    args.push(this.parseExpression({ stopAtNewline: false, stopAtBlock: false }));
                    this.skipNewlines();
                    if (this.matchSymbol(",")) { this.skipNewlines(); continue; }
                    break;
                }
                this.skipNewlines();
                this.expectSymbol(")");
                expression = { type: "call", callee: expression, arguments: args, line: token.line };
                continue;
            }
            break;
        }
        return expression;
    }
}

class LucidRuntime {
    constructor(source, mount, options = {}) {
        this.source = source;
        this.mount = mount;
        this.options = options;
        this.ast = new Parser(source).parse();
        this.environment = new Environment();
        this.functions = new Map();
        this.bindings = [];
        this.appName = "Lucid App";
        this.windowTitle = "Lucid App";
        this.windowNode = null;

        this.collectFunctions(this.ast);
        this.setupBuiltins();
        this.prepareMetadata();
    }

    setupBuiltins() {
        this.builtins = {
            "notification.show": (message) => { showNotification(String(message ?? "")); return true; },
            "theme.current": () => document.documentElement?.dataset?.theme || "dark",
            "files.read": (path) => readLucidFile(String(path)),
            "files.write": (path, content) => { writeLucidFile(String(path), String(content ?? "")); return true; }
        };
    }

    collectFunctions(nodes) {
        for (const node of nodes) {
            if (node.type === "function") this.functions.set(node.name, node);
            if (node.children) this.collectFunctions(node.children);
            if (node.elseChildren) this.collectFunctions(node.elseChildren);
        }
    }

    prepareMetadata() {
        const appNode = this.ast.find(node => node.type === "app");
        if (appNode) this.appName = String(this.evaluate(appNode.value, this.environment));

        this.windowNode = this.ast.find(node => node.type === "window");
        if (this.windowNode) {
            const titleNode = this.windowNode.children.find(node => node.type === "title");
            if (titleNode) this.windowTitle = String(this.evaluate(titleNode.value, this.environment));
        }
    }

    refreshBindings() {
        for (const update of this.bindings) {
            try { update(); } catch (error) { console.error("Lucid binding update:", error); }
        }
    }

    run() {
        this.render();
        return { appName: this.appName, windowTitle: this.windowTitle, permissions: this.options.permissions || [] };
    }

    render() {
        this.mount.innerHTML = `
            <div class="lucid-preview-app">
                <div class="lucid-preview-top">
                    <span class="lucid-preview-app-name">${escapeHTML(this.appName)}</span>
                    <span class="lucid-preview-runtime">LUCID RUNTIME</span>
                </div>
                <div class="lucid-preview-window">
                    <div class="lucid-preview-title">${escapeHTML(this.windowTitle)}</div>
                    <div class="lucid-preview-body" data-lucid-body></div>
                </div>
            </div>
        `;

        const body = this.mount.querySelector("[data-lucid-body]");
        if (!this.windowNode) {
            body.innerHTML = '<div class="lucid-preview-error">No window was created.</div>';
            return;
        }
        try {
            this.executeNodes(this.windowNode.children, this.environment, body);
        } catch (error) {
            showRuntimeError(body, error);
        }
    }

    executeNodes(nodes, environment, container) {
        for (const node of nodes) {
            const result = this.executeNode(node, environment, container);
            if (result && result.type === "return") return result;
        }
        return null;
    }

    executeNode(node, environment, container) {
        try {
            switch (node.type) {
                case "app": case "window": case "title": case "function": return;
                case "let": {
                    const value = this.evaluate(node.value, environment);
                    environment.define(node.name, value);
                    return;
                }
                case "set": {
                    const value = this.evaluate(node.value, environment);
                    environment.set(node.name, value);
                    this.refreshBindings();
                    return;
                }
                case "text": {
                    const element = document.createElement("p");
                    element.className = "lucid-preview-text";
                    container.appendChild(element);
                    const update = () => {
                        try {
                            const value = this.evaluate(node.value, environment);
                            element.textContent = String(value);
                        } catch (error) { element.textContent = error.message; }
                    };
                    this.bindings.push(update);
                    update();
                    return;
                }
                case "button": {
                    const value = this.evaluate(node.value, environment);
                    const button = document.createElement("button");
                    button.className = "lucid-preview-button";
                    button.textContent = String(value);
                    const clickNode = node.children.find(child => child.type === "onClick");
                    if (clickNode) {
                        button.addEventListener("click", () => {
                            try { this.executeNodes(clickNode.children, environment, container); }
                            catch (error) { showRuntimeError(container, error); }
                        });
                    }
                    container.appendChild(button);
                    return;
                }
                case "if": {
                    const condition = this.evaluate(node.condition, environment);
                    if (Boolean(condition)) return this.executeNodes(node.children, environment, container);
                    if (node.elseChildren) return this.executeNodes(node.elseChildren, environment, container);
                    return;
                }
                case "repeat": {
                    const count = Number(this.evaluate(node.count, environment));
                    if (!Number.isFinite(count)) throw new LucidScriptError("repeat needs a number.", node.line);
                    const safeCount = Math.max(0, Math.floor(count));
                    if (safeCount > 10000) throw new LucidScriptError("repeat cannot run more than 10,000 times.", node.line);
                    for (let i = 0; i < safeCount; i++) {
                        const result = this.executeNodes(node.children, environment, container);
                        if (result && result.type === "return") return result;
                    }
                    return;
                }
                case "each": {
                    const collection = this.evaluate(node.collection, environment);
                    if (!Array.isArray(collection)) throw new LucidScriptError("each needs a list.", node.line);
                    for (const item of collection) {
                        if (environment.hasLocal(node.variable)) environment.set(node.variable, item);
                        else environment.define(node.variable, item);
                        const result = this.executeNodes(node.children, environment, container);
                        if (result && result.type === "return") return result;
                    }
                    return;
                }
                case "return": return { type: "return", value: this.evaluate(node.value, environment) };
                case "expression": return this.evaluate(node.expression, environment);
                default: throw new LucidScriptError(`Unknown statement "${node.type}".`, node.line);
            }
        } catch (error) {
            if (error instanceof LucidScriptError) {
                if (error.line) throw error;
                throw new LucidScriptError(error.message, node.line);
            }
            throw new LucidScriptError(error.message || "Runtime error.", node.line);
        }
    }

    evaluate(node, environment) {
        switch (node.type) {
            case "literal": return node.value;
            case "identifier": return environment.get(node.name);
            case "array": return node.items.map(item => this.evaluate(item, environment));
            case "object": {
                const object = {};
                for (const property of node.properties) object[property.key] = this.evaluate(property.value, environment);
                return object;
            }
            case "unary": {
                const value = this.evaluate(node.value, environment);
                switch (node.operator) {
                    case "!": return !value;
                    case "-": return -Number(value);
                    default: throw new LucidScriptError(`Unknown unary operator "${node.operator}".`);
                }
            }
            case "binary": {
                const left = this.evaluate(node.left, environment);
                if (node.operator === "&&") return Boolean(left) && Boolean(this.evaluate(node.right, environment));
                if (node.operator === "||") return Boolean(left) || Boolean(this.evaluate(node.right, environment));
                const right = this.evaluate(node.right, environment);
                return this.applyBinary(node.operator, left, right);
            }
            case "member": {
                const object = this.evaluate(node.object, environment);
                if (object == null) return undefined;
                return object[node.property];
            }
            case "index": {
                const object = this.evaluate(node.object, environment);
                const index = this.evaluate(node.index, environment);
                if (object == null) return undefined;
                return object[index];
            }
            case "call": return this.evaluateCall(node, environment);
            default: throw new LucidScriptError(`Unknown expression "${node.type}".`);
        }
    }

    evaluateCall(node, environment) {
        const args = node.arguments.map(argument => this.evaluate(argument, environment));

        if (node.callee.type === "member") {
            const path = this.getMemberPath(node.callee);
            if (path) {
                const builtin = this.builtins[path];
                if (typeof builtin === "function") return builtin(...args);
            }
        }

        if (node.callee.type === "identifier") {
            const functionName = node.callee.name;
            const userFunction = this.functions.get(functionName);
            if (userFunction) return this.callFunction(userFunction, args);
            if (environment.has(functionName)) {
                const value = environment.get(functionName);
                if (typeof value === "function") return value(...args);
            }
        }

        throw new LucidScriptError(`Unknown function "${this.expressionToName(node.callee)}".`);
    }

    getMemberPath(node) {
        if (node.type === "identifier") return node.name;
        if (node.type !== "member") return null;
        const parent = this.getMemberPath(node.object);
        if (!parent) return null;
        return parent + "." + node.property;
    }

    expressionToName(node) { const path = this.getMemberPath(node); return path || "expression"; }

    callFunction(functionNode, args) {
        const local = new Environment(this.environment);
        functionNode.parameters.forEach((parameter, index) => local.define(parameter, args[index]));
        const body = this.mount.querySelector("[data-lucid-body]");
        const result = this.executeNodes(functionNode.body, local, body);
        return result?.type === "return" ? result.value : undefined;
    }

    applyBinary(operator, left, right) {
        switch (operator) {
            case "+": return (typeof left === "string" || typeof right === "string") ? String(left) + String(right) : Number(left) + Number(right);
            case "-": return Number(left) - Number(right);
            case "*": return Number(left) * Number(right);
            case "/": return Number(left) / Number(right);
            case "%": return Number(left) % Number(right);
            case "==": return left == right;
            case "!=": return left != right;
            case ">": return left > right;
            case "<": return left < right;
            case ">=": return left >= right;
            case "<=": return left <= right;
            default: throw new LucidScriptError(`Unknown operator "${operator}".`);
        }
    }
}

function runLucidScript(source, mount, options = {}) {
    const runtime = new LucidRuntime(source, mount, options);
    const result = runtime.run();
    mount.__lucidRuntime = runtime;
    return result;
}

function readLucidFile(path) {
    const key = `lucid-studio-file:${path}`;
    return localStorage.getItem(key) || "";
}

function writeLucidFile(path, content) {
    const key = `lucid-studio-file:${path}`;
    localStorage.setItem(key, String(content));
    return true;
}

function showNotification(message) {
    let container = document.querySelector(".lucid-script-notifications");
    if (!container) {
        container = document.createElement("div");
        container.className = "lucid-script-notifications";
        document.body.appendChild(container);
    }
    const item = document.createElement("div");
    item.className = "lucid-script-notification";
    item.textContent = message;
    container.appendChild(item);
    setTimeout(() => {
        item.style.opacity = "0";
        item.style.transform = "translateY(-6px)";
        setTimeout(() => item.remove(), 180);
    }, 2200);
}

function showRuntimeError(container, error) {
    const element = document.createElement("div");
    element.className = "lucid-runtime-error";
    element.textContent = error.message || "Lucid runtime error.";
    container.appendChild(element);
}

function buildManifest({ id, name, version = "1.0.0", description = "", language = "lucid-script", permissions = [] }) {
    return { format: "lucid-app", formatVersion: 1, id, name, version, description, language, permissions };
}

function escapeHTML(text) {
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export { runLucidScript, buildManifest, readLucidFile, writeLucidFile };

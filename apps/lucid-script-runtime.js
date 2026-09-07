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
    const add = (type, value, tokenLine = line) => tokens.push({ type, value, line: tokenLine });

    while (index < source.length) {
        const char = source[index];
        if (char === "\n") { add("newline", "\n", line); index++; line++; continue; }
        if (char === "\r" || char === " " || char === "\t") { index++; continue; }
        if (char === "/" && source[index + 1] === "/") {
            while (index < source.length && source[index] !== "\n") index++;
            continue;
        }
        if (char === '"' || char === "'") {
            const quote = char;
            const startLine = line;
            let value = "";
            index++;
            let closed = false;
            while (index < source.length) {
                const current = source[index];
                if (current === quote && source[index - 1] !== "\\") { index++; closed = true; break; }
                if (current === "\n") line++;
                if (current === "\\" && source[index + 1]) {
                    const next = source[index + 1];
                    if (next === "n") { value += "\n"; index += 2; continue; }
                    if (next === "t") { value += "\t"; index += 2; continue; }
                    if (next === "r") { value += "\r"; index += 2; continue; }
                    if (next === "\\" || next === '"' || next === "'") { value += next; index += 2; continue; }
                }
                value += current;
                index++;
            }
            if (!closed) throw new LucidScriptError("Unterminated string.", startLine);
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
        return token.type === type && (value === null || token.value === value);
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
        if (!this.matchSymbol(symbol)) throw new LucidScriptError(message || `Expected "${symbol}".`, this.current().line);
    }
    expectOperator(operator) {
        if (!this.matchOperator(operator)) throw new LucidScriptError(`Expected "${operator}".`, this.current().line);
    }
    expectIdentifier(message = null) {
        const token = this.current();
        if (token.type !== "identifier") throw new LucidScriptError(message || "Expected a name.", token.line);
        this.advance();
        return token;
    }
    skipNewlines() { while (this.check("newline")) this.advance(); }
    parse() {
        const program = this.parseBlock(false);
        this.skipNewlines();
        if (!this.check("eof")) throw new LucidScriptError(`Unexpected "${this.current().value}".`, this.current().line);
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
            case "heading": return { type: "heading", value: this.parseExpressionLine(), line: token.line };
            case "button": return { type: "button", value: this.parseExpressionUntilBlock(), children: this.parseRequiredBlock(token.line), line: token.line };
            case "input": return { type: "input", value: this.parseExpressionUntilBlock(), children: this.parseRequiredBlock(token.line, true), line: token.line };
            case "checkbox": return { type: "checkbox", value: this.parseExpressionUntilBlock(), children: this.parseRequiredBlock(token.line, true), line: token.line };
            case "select": return { type: "select", value: this.parseExpressionUntilBlock(), children: this.parseRequiredBlock(token.line), line: token.line };
            case "option": return { type: "option", value: this.parseExpressionLine(), line: token.line };
            case "image": return { type: "image", value: this.parseExpressionUntilBlock(), children: this.parseOptionalBlock(), line: token.line };
            case "onClick": return { type: "onClick", children: this.parseRequiredBlock(token.line), line: token.line };
            case "onInput": return { type: "onInput", children: this.parseRequiredBlock(token.line), line: token.line };
            case "onChange": return { type: "onChange", children: this.parseRequiredBlock(token.line), line: token.line };
            case "let": {
                const name = this.expectIdentifier("Expected a variable name after 'let'.");
                this.expectOperator("=");
                return { type: "let", name: name.value, value: this.parseExpressionLine(), line: token.line };
            }
            case "set": {
                const name = this.expectIdentifier("Expected a variable name after 'set'.");
                this.expectOperator("=");
                return { type: "set", name: name.value, value: this.parseExpressionLine(), line: token.line };
            }
            case "if": {
                const condition = this.parseExpressionUntilBlock();
                const children = this.parseRequiredBlock(token.line);
                this.skipNewlines();
                let elseChildren = null;
                if (this.check("identifier", "else")) { this.advance(); elseChildren = this.parseRequiredBlock(token.line); }
                return { type: "if", condition, children, elseChildren, line: token.line };
            }
            case "repeat": return { type: "repeat", count: this.parseExpressionUntilBlock(), children: this.parseRequiredBlock(token.line), line: token.line };
            case "each": {
                const variable = this.expectIdentifier("Expected a variable name after 'each'.");
                if (!this.check("identifier", "in")) throw new LucidScriptError("Expected 'in' after the each variable.", this.current().line);
                this.advance();
                return { type: "each", variable: variable.value, collection: this.parseExpressionUntilBlock(), children: this.parseRequiredBlock(token.line), line: token.line };
            }
            case "function": {
                const name = this.expectIdentifier("Expected a function name.");
                const parameters = [];
                if (this.matchSymbol("(")) {
                    while (!this.check("symbol", ")")) {
                        parameters.push(this.expectIdentifier("Expected a parameter name.").value);
                        if (!this.matchSymbol(",")) break;
                    }
                    this.expectSymbol(")");
                }
                return { type: "function", name: name.value, parameters, body: this.parseRequiredBlock(token.line), line: token.line };
            }
            case "return": return { type: "return", value: this.parseExpressionLine(), line: token.line };
            case "else": throw new LucidScriptError("'else' must come immediately after an 'if'.", token.line);
            default: return { type: "expression", expression: this.parseExpressionAfterIdentifier(command), line: token.line };
        }
    }
    parseRequiredBlock(line, allowEmpty = false) {
        this.skipNewlines();
        this.expectSymbol("{", "Expected '{' to open a block.");
        return this.parseBlock(true, allowEmpty);
    }
    parseOptionalBlock() {
        this.skipNewlines();
        if (!this.check("symbol", "{")) return [];
        this.advance();
        return this.parseBlock(true);
    }
    parseExpressionLine() { return this.parseExpression({ stopAtNewline: true }); }
    parseExpressionUntilBlock() { return this.parseExpression({ stopAtNewline: false }); }
    parseExpressionAfterIdentifier(identifier) {
        return this.parseBinaryExpressionWithFirst(0, { type: "identifier", value: identifier, line: this.previous()?.line || this.current().line });
    }
    parseExpression(options = {}) { return this.parseBinaryExpression(0, options); }
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
    isExpressionOperator() {
        const token = this.current();
        return token.type === "operator" && this.getPrecedence(token.value) >= 0;
    }
    parseBinaryExpression(minimumPrecedence, options) {
        let left = this.parseUnary(options);
        while (this.isExpressionOperator()) {
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
        while (this.isExpressionOperator()) {
            const token = this.current();
            const precedence = this.getPrecedence(token.value);
            if (precedence < minimumPrecedence) break;
            this.advance();
            const right = this.parseBinaryExpression(precedence + 1, { stopAtNewline: true });
            left = { type: "binary", operator: token.value, left, right, line: token.line };
        }
        return left;
    }
    parseUnary(options) {
        const token = this.current();
        if (token.type === "operator" && (token.value === "!" || token.value === "-")) {
            this.advance();
            return { type: "unary", operator: token.value, value: this.parseUnary(options), line: token.line };
        }
        return this.parsePrimary(options);
    }
    parsePrimary() {
        const token = this.current();
        if (token.type === "number" || token.type === "string") {
            this.advance();
            return { type: "literal", value: token.value, line: token.line };
        }
        if (token.type === "identifier") {
            this.advance();
            if (token.value === "true") return { type: "literal", value: true, line: token.line };
            if (token.value === "false") return { type: "literal", value: false, line: token.line };
            if (token.value === "null") return { type: "literal", value: null, line: token.line };
            return this.makePrimaryFromIdentifier(token);
        }
        if (this.matchSymbol("(")) {
            const expression = this.parseExpression({ stopAtNewline: false });
            this.expectSymbol(")");
            return expression;
        }
        if (this.matchSymbol("[")) {
            const items = [];
            this.skipNewlines();
            while (!this.check("symbol", "]")) {
                items.push(this.parseExpression({ stopAtNewline: true }));
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
                const value = this.parseExpression({ stopAtNewline: true });
                properties.push({ key: key.value, value });
                this.skipNewlines();
                if (!this.matchSymbol(",")) this.skipNewlines();
                else this.skipNewlines();
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
            if (this.matchSymbol("[")) {
                const index = this.parseExpression({ stopAtNewline: false });
                this.expectSymbol("]");
                expression = { type: "index", object: expression, index, line: token.line };
                continue;
            }
            if (this.matchSymbol("(")) {
                const args = [];
                this.skipNewlines();
                while (!this.check("symbol", ")")) {
                    args.push(this.parseExpression({ stopAtNewline: false }));
                    this.skipNewlines();
                    if (!this.matchSymbol(",")) break;
                    this.skipNewlines();
                }
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
            "notification.show": message => { showNotification(String(message ?? "")); return true; },
            "theme.current": () => document.documentElement?.dataset?.theme || "dark",
            "files.read": path => readLucidFile(String(path)),
            "files.write": (path, content) => { writeLucidFile(String(path), String(content ?? "")); return true; },
            "storage.get": key => localStorage.getItem(`lucid-script-storage:${String(key)}`),
            "storage.set": (key, value) => { localStorage.setItem(`lucid-script-storage:${String(key)}`, String(value ?? "")); return true; },
            "storage.remove": key => { localStorage.removeItem(`lucid-script-storage:${String(key)}`); return true; },
            "random.number": (min = 0, max = 1) => Math.random() * (Number(max) - Number(min)) + Number(min),
            "random.integer": (min = 0, max = 1) => Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min),
            "random.pick": items => Array.isArray(items) && items.length ? items[Math.floor(Math.random() * items.length)] : null,
            "time.now": () => new Date().toLocaleString(),
            "time.hour": () => new Date().getHours(),
            "clipboard.copy": async value => { try { await navigator.clipboard.writeText(String(value ?? "")); return true; } catch { return false; } },
            "window.open": url => { const value = String(url ?? ""); if (!/^https?:\/\//i.test(value)) return false; window.open(value, "_blank", "noopener,noreferrer"); return true; },
            "math.round": value => Math.round(Number(value)),
            "math.floor": value => Math.floor(Number(value)),
            "math.ceil": value => Math.ceil(Number(value)),
            "math.abs": value => Math.abs(Number(value))
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
        try { this.executeNodes(this.windowNode.children, this.environment, body); }
        catch (error) { showRuntimeError(body, error); }
    }
    executeNodes(nodes, environment, container) {
        for (const node of nodes) {
            const result = this.executeNode(node, environment, container);
            if (result?.type === "return") return result;
        }
        return null;
    }
    executeNode(node, environment, container) {
        try {
            switch (node.type) {
                case "app": case "window": case "title": case "function": case "onClick": case "onInput": case "onChange": case "option": return;
                case "let": environment.define(node.name, this.evaluate(node.value, environment)); return;
                case "set": environment.set(node.name, this.evaluate(node.value, environment)); this.refreshBindings(); return;
                case "text": {
                    const element = document.createElement("p");
                    element.className = "lucid-preview-text";
                    container.appendChild(element);
                    const update = () => element.textContent = interpolate(String(this.evaluate(node.value, environment)), environment);
                    this.bindings.push(update);
                    update();
                    return;
                }
                case "heading": {
                    const element = document.createElement("h3");
                    element.className = "lucid-preview-heading";
                    element.textContent = interpolate(String(this.evaluate(node.value, environment)), environment);
                    container.appendChild(element);
                    return;
                }
                case "button": {
                    const button = document.createElement("button");
                    button.className = "lucid-preview-button";
                    button.textContent = String(this.evaluate(node.value, environment));
                    const clickNode = node.children.find(child => child.type === "onClick");
                    if (clickNode) button.addEventListener("click", () => this.runEvent(clickNode, environment, container, { value: button.textContent, target: button }));
                    container.appendChild(button);
                    return;
                }
                case "input": {
                    const input = document.createElement("input");
                    input.className = "lucid-preview-input";
                    input.type = "text";
                    input.placeholder = String(this.evaluate(node.value, environment));
                    const eventNode = node.children.find(child => child.type === "onInput");
                    if (eventNode) input.addEventListener("input", () => this.runEvent(eventNode, environment, container, { value: input.value, target: input }));
                    container.appendChild(input);
                    return;
                }
                case "checkbox": {
                    const label = document.createElement("label");
                    label.className = "lucid-preview-checkbox";
                    const input = document.createElement("input");
                    input.type = "checkbox";
                    const text = document.createElement("span");
                    text.textContent = String(this.evaluate(node.value, environment));
                    label.append(input, text);
                    const eventNode = node.children.find(child => child.type === "onChange");
                    if (eventNode) input.addEventListener("change", () => this.runEvent(eventNode, environment, container, { value: input.checked, checked: input.checked, target: input }));
                    container.appendChild(label);
                    return;
                }
                case "select": {
                    const select = document.createElement("select");
                    select.className = "lucid-preview-select";
                    const placeholder = document.createElement("option");
                    placeholder.value = "";
                    placeholder.textContent = String(this.evaluate(node.value, environment));
                    placeholder.disabled = true;
                    placeholder.selected = true;
                    select.appendChild(placeholder);
                    node.children.filter(child => child.type === "option").forEach(optionNode => {
                        const option = document.createElement("option");
                        option.textContent = String(this.evaluate(optionNode.value, environment));
                        option.value = option.textContent;
                        select.appendChild(option);
                    });
                    const eventNode = node.children.find(child => child.type === "onChange");
                    if (eventNode) select.addEventListener("change", () => this.runEvent(eventNode, environment, container, { value: select.value, target: select }));
                    container.appendChild(select);
                    return;
                }
                case "image": {
                    const image = document.createElement("img");
                    image.className = "lucid-preview-image";
                    image.src = String(this.evaluate(node.value, environment));
                    image.alt = node.children[0] ? String(this.evaluate(node.children[0].value, environment)) : "";
                    image.loading = "lazy";
                    container.appendChild(image);
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
                        if (result?.type === "return") return result;
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
                        if (result?.type === "return") return result;
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
    runEvent(node, environment, container, event) {
        const eventEnvironment = new Environment(environment);
        eventEnvironment.define("event", event);
        try { this.executeNodes(node.children, eventEnvironment, container); }
        catch (error) { showRuntimeError(container, error); }
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
                if (node.operator === "!") return !value;
                if (node.operator === "-") return -Number(value);
                throw new LucidScriptError(`Unknown unary operator "${node.operator}".`);
            }
            case "binary": {
                const left = this.evaluate(node.left, environment);
                if (node.operator === "&&") return Boolean(left) && Boolean(this.evaluate(node.right, environment));
                if (node.operator === "||") return Boolean(left) || Boolean(this.evaluate(node.right, environment));
                return this.applyBinary(node.operator, left, this.evaluate(node.right, environment));
            }
            case "member": {
                const object = this.evaluate(node.object, environment);
                return object == null ? undefined : object[node.property];
            }
            case "index": {
                const object = this.evaluate(node.object, environment);
                const index = this.evaluate(node.index, environment);
                return object == null ? undefined : object[index];
            }
            case "call": return this.evaluateCall(node, environment);
            default: throw new LucidScriptError(`Unknown expression "${node.type}".`);
        }
    }
    evaluateCall(node, environment) {
        const args = node.arguments.map(argument => this.evaluate(argument, environment));
        if (node.callee.type === "member") {
            const path = this.getMemberPath(node.callee);
            const builtin = path ? this.builtins[path] : null;
            if (typeof builtin === "function") return builtin(...args);
        }
        if (node.callee.type === "identifier") {
            const userFunction = this.functions.get(node.callee.name);
            if (userFunction) return this.callFunction(userFunction, args);
            if (environment.has(node.callee.name)) {
                const value = environment.get(node.callee.name);
                if (typeof value === "function") return value(...args);
            }
        }
        throw new LucidScriptError(`Unknown function "${this.expressionToName(node.callee)}".`);
    }
    getMemberPath(node) {
        if (node.type === "identifier") return node.name;
        if (node.type !== "member") return null;
        const parent = this.getMemberPath(node.object);
        return parent ? `${parent}.${node.property}` : null;
    }
    expressionToName(node) { return this.getMemberPath(node) || "expression"; }
    callFunction(functionNode, args) {
        const local = new Environment(this.environment);
        functionNode.parameters.forEach((parameter, index) => local.define(parameter, args[index]));
        const body = this.mount.querySelector("[data-lucid-body]");
        const result = this.executeNodes(functionNode.body, local, body);
        return result?.type === "return" ? result.value : undefined;
    }
    applyBinary(operator, left, right) {
        switch (operator) {
            case "+": return typeof left === "string" || typeof right === "string" ? String(left) + String(right) : Number(left) + Number(right);
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
    return localStorage.getItem(`lucid-studio-file:${path}`) || "";
}

function writeLucidFile(path, content) {
    localStorage.setItem(`lucid-studio-file:${path}`, String(content));
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

function interpolate(text, environment) {
    return text.replace(/\{([^{}]+)\}/g, (_, expression) => {
        try {
            const value = evaluatePath(expression.trim(), environment);
            return value == null ? "" : String(value);
        } catch {
            return `{${expression}}`;
        }
    });
}

function evaluatePath(path, environment) {
    const parts = path.split(".").map(item => item.trim()).filter(Boolean);
    if (!parts.length) return "";
    let value = environment.get(parts.shift());
    for (const part of parts) value = value == null ? undefined : value[part];
    return value;
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
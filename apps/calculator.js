import { createWindow } from "../js/window-manager.js";
import { notifyAnomalyEngine } from "../js/anomaly-engine.js";

function createCalculator() {
    notifyAnomalyEngine("calculator-opened");

    const content = `
        <div class="lucid-calculator">
            <div class="calculator-display">
                <div class="calculator-expression"></div>
                <div class="calculator-result">0</div>
            </div>
            <div class="calculator-buttons">
                <button data-action="clear">AC</button>
                <button data-action="backspace">←</button>
                <button data-value="%">%</button>
                <button data-value="/">÷</button>
                <button data-value="7">7</button>
                <button data-value="8">8</button>
                <button data-value="9">9</button>
                <button data-value="*">×</button>
                <button data-value="4">4</button>
                <button data-value="5">5</button>
                <button data-value="6">6</button>
                <button data-value="-">−</button>
                <button data-value="1">1</button>
                <button data-value="2">2</button>
                <button data-value="3">3</button>
                <button data-value="+">+</button>
                <button data-value="0">0</button>
                <button data-value=".">.</button>
                <button data-action="equals">=</button>
            </div>
        </div>
    `;

    const windowElement = createWindow("🧮 Calculator", content);

    const expressionDisplay = windowElement.querySelector(".calculator-expression");
    const resultDisplay = windowElement.querySelector(".calculator-result");

    let expression = "";

    function updateDisplay() {
        expressionDisplay.textContent = expression;
        if (!expression) {
            resultDisplay.textContent = "0";
        }
    }

    function calculate() {
        if (!expression) return;

        try {
            if (!/^[0-9+\-*/%.()\s]+$/.test(expression)) {
                throw new Error();
            }

            const result = Function(`"use strict"; return (${expression})`)();

            if (!Number.isFinite(result)) {
                throw new Error();
            }

            resultDisplay.textContent = result;

            notifyAnomalyEngine("calculator-used", { expression, result });
        } catch {
            resultDisplay.textContent = "Error";
        }
    }

    const buttons = windowElement.querySelectorAll(".calculator-buttons button");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const value = button.dataset.value;
            const action = button.dataset.action;

            if (value) {
                expression += value;
                updateDisplay();
            }

            if (action === "clear") {
                expression = "";
                updateDisplay();
                resultDisplay.textContent = "0";
            }

            if (action === "backspace") {
                expression = expression.slice(0, -1);
                updateDisplay();
            }

            if (action === "equals") {
                calculate();
            }
        });
    });

    document.addEventListener("keydown", function calculatorKeyboard(event) {
        if (!windowElement.isConnected) {
            document.removeEventListener("keydown", calculatorKeyboard);
            return;
        }

        if (/^[0-9+\-*/%.()]$/.test(event.key)) {
            expression += event.key;
            updateDisplay();
        }

        if (event.key === "Enter") {
            calculate();
        }

        if (event.key === "Backspace") {
            expression = expression.slice(0, -1);
            updateDisplay();
        }

        if (event.key === "Escape") {
            expression = "";
            updateDisplay();
            resultDisplay.textContent = "0";
        }
    });

    updateDisplay();

    return windowElement;
}

export { createCalculator };
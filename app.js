import { generateUniqueRebus } from './math-core.js?v=2';

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const difficultyRadios = document.getElementsByName('difficulty');
    const rebusContainer = document.getElementById('rebus-container');

    const resetBtn = document.getElementById('reset-btn');
    const hintBtn = document.getElementById('hint-btn');
    const checkBtn = document.getElementById('check-btn');

    let currentRebus = null;

    // ГЕНЕРАЦІЯ РЕБУСУ
    generateBtn.addEventListener('click', () => {
        let selectedDifficulty = 'easy';

        for (const radio of difficultyRadios) {
            if (radio.checked) {
                const val = radio.value.toLowerCase();
                if (val.includes('easy') || val === '1') selectedDifficulty = 'easy';
                else if (val.includes('medium') || val === '2') selectedDifficulty = 'medium';
                else if (val.includes('hard') || val === '3') selectedDifficulty = 'hard';
                break;
            }
        }

        generateBtn.innerText = "Генерую...";
        generateBtn.disabled = true;

        setTimeout(() => {
            try {
                currentRebus = generateUniqueRebus(selectedDifficulty);
                if (currentRebus) { renderRebusToDOM(currentRebus, rebusContainer); }
                else { alert("Не вдалося знайти ідеальну комбінацію. Спробуйте ще раз!"); }
            } catch (error) {
                console.error("Помилка генерації:", error);
                alert("Виникла помилка під час обчислень");
            } finally {
                generateBtn.innerText = "Створити";
                generateBtn.disabled = false;
            }
        }, 50);
    });

    // КНОПКА: СКИНУТИ
    resetBtn.addEventListener('click', () => {
        if (!currentRebus) return;
        const inputs = document.querySelectorAll('.rebus-input');
        inputs.forEach(input => {
            if (!input.disabled) {
                input.value = '';
                input.classList.remove('correct', 'incorrect');
            }
        });
    });

    // КНОПКА: ПІДКАЗКА
    hintBtn.addEventListener('click', () => {
        if (!currentRebus) return;
        const inputs = Array.from(document.querySelectorAll('.rebus-input'));
        const emptyOrWrongInputs = inputs.filter(input => input.value !== input.dataset.correct);

        if (emptyOrWrongInputs.length > 0) {
            const randomInput = emptyOrWrongInputs[Math.floor(Math.random() * emptyOrWrongInputs.length)];
            randomInput.value = randomInput.dataset.correct;
            randomInput.classList.remove('incorrect');
            randomInput.classList.add('correct');
            randomInput.disabled = true;
        } else {
            alert("Усі поля вже заповнені правильно!");
        }
    });

    // КНОПКА: ПЕРЕВІРИТИ
    checkBtn.addEventListener('click', () => {
        if (!currentRebus) return;
        const inputs = document.querySelectorAll('.rebus-input');
        let allCorrect = true;

        inputs.forEach(input => {
            input.classList.remove('correct', 'incorrect');

            if (input.value === input.dataset.correct) {
                input.classList.add('correct');
            } else {
                input.classList.add('incorrect');
                allCorrect = false;
            }
        });

        if (allCorrect) {
            setTimeout(() => alert("Вітаємо! Ви успішно розв'язали ребус!"), 100);
        }
    });
});

// Функція для відмальовування ребусу на сторінці
function renderRebusToDOM(maskedStructure, container) {
    container.innerHTML = '';
    container.style.display = 'inline-block';

    const createLine = (charsArray, originalStr, shiftSpacesCount = 0, isBordered = false, isMultiplier = false) => {
        const div = document.createElement('div');
        // Залишаємо лише структурні стилі (flexbox), яких немає в CSS для рядків
        div.style.position = 'relative';
        div.style.display = 'flex';
        div.style.justifyContent = 'flex-end';

        // Знак множення
        if (isMultiplier) {
            const sign = document.createElement('span');
            sign.innerText = '×';
            sign.style.position = 'absolute';
            sign.style.left = '-30px';
            div.appendChild(sign);
        }

        const originalChars = String(originalStr).split('');

        // Малюємо цифри та інпути
        charsArray.forEach((char, index) => {
            if (char === '*') {
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.className = 'rebus-input';
                input.placeholder = '*';

                input.dataset.correct = originalChars[index];

                input.addEventListener('input', function() {
                    this.value = this.value.replace(/[^0-9]/g, '');
                    this.classList.remove('correct', 'incorrect');
                });

                div.appendChild(input);
            } else {
                const span = document.createElement('span');
                span.innerText = char;
                span.className = 'rebus-char';
                div.appendChild(span);
            }
        });

        // Відступи для часткових добутків (зсув вліво)
        for(let i = 0; i < shiftSpacesCount; i++) {
            const space = document.createElement('span');
            // Додаємо невидимий символ '0', щоб він займав рівно стільки ж місця, скільки звичайна цифра
            space.innerText = '0';
            space.className = 'rebus-char space-char'; // Беремо прозорість з CSS
            div.appendChild(space);
        }

        // Нижня лінія (підкреслення)
        if (isBordered) {
            div.classList.add('bordered-line');
        }

        container.appendChild(div);
    };

    // Відмальовуємо всі рядки
    createLine(maskedStructure.M, maskedStructure.original.M);
    createLine(maskedStructure.N, maskedStructure.original.N, 0, true, true);

    maskedStructure.partialProducts.forEach((prodChars, index) => {
        createLine(prodChars, maskedStructure.original.partialProducts[index], index);
    });

    if (maskedStructure.P) {
        container.lastChild.classList.add('bordered-line');
        createLine(maskedStructure.P, maskedStructure.original.P);
    }
}
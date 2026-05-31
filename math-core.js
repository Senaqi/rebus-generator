function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBasicExample(level) {
    const allowedSizes = {
        easy: [[3, 1], [1, 3], [2, 2]],
        medium: [[3, 2], [2, 3], [3, 3]],
        hard: [[4, 3], [3, 4], [4, 4], [5, 3], [3, 5], [5, 4], [4, 5], [5, 5]]
    };

    // Якщо рівень не розпізнано, беремо середній
    const sizesForLevel = allowedSizes[level] || allowedSizes['medium'];

    // Вибираємо одну випадкову пару розмірів з доступних для цього рівня
    const randomPair = sizesForLevel[Math.floor(Math.random() * sizesForLevel.length)];
    const m = randomPair[0]; // кількість цифр першого числа (M)
    const n = randomPair[1]; // кількість цифр другого числа (N)

    // Мінімальні та максимальні значення для цих розмірів
    const M_min = Math.pow(10, m - 1);
    const M_max = Math.pow(10, m) - 1;
    const N_min = Math.pow(10, n - 1);
    const N_max = Math.pow(10, n) - 1;

    let M, N, P, partialProducts;
    let isValid = false;

    while (!isValid) {
        M = getRandomInt(M_min, M_max);
        N = getRandomInt(N_min, N_max);
        P = M * N;
        partialProducts = [];
        const nDigits = String(N).split('').reverse().map(Number);
        let hasZeroRow = false;

        for (let i = 0; i < nDigits.length; i++) {
            const partialResult = M * nDigits[i];
            partialProducts.push(partialResult);
            // Відкидаємо множення на нуль (щоб не було нульових рядків)
            if (partialResult === 0) hasZeroRow = true;
        }
        if (!hasZeroRow) isValid = true;
    }

    return { M, N, P, partialProducts };
}

// Алгоритм 2.3: Зонове приховування цифр. Гарантує рівномірний розподіл зірочок між множниками, частковими добутками та результатом
function hideDigits(structure, level) {
    let minPercent = level === 'easy' ? 0.30 : (level === 'medium' ? 0.40 : 0.55);
    let maxPercent = level === 'easy' ? 0.40 : (level === 'medium' ? 0.55 : 0.70);
    const targetPercent = Math.random() * (maxPercent - minPercent) + minPercent;

    // Розбиваємо позиції на зони
    let zoneA = []; // Множники M та N
    let zoneB = []; // Часткові добутки
    let zoneC = []; // Фінальний результат P

    const addPos = (str, type, zone, rIdx = null) => {
        for (let i = 0; i < str.length; i++) {
            // Даємо першій цифрі менший пріоритет на приховування
            let weight = (i === 0) ? 0.5 : 1.0;
            zone.push({ type, rIdx, cIdx: i, weight, rand: Math.random() * weight });
        }
    };

    addPos(String(structure.M), 'M', zoneA);
    addPos(String(structure.N), 'N', zoneA);
    structure.partialProducts.forEach((p, idx) => addPos(String(p), 'partial', zoneB, idx));
    if (structure.partialProducts.length > 1) addPos(String(structure.P), 'P', zoneC);

    const totalDigits = zoneA.length + zoneB.length + zoneC.length;
    // Гарантуємо, що ховаємо хоча б 1 цифру
    const targetHidden = Math.max(1, Math.floor(totalDigits * targetPercent));

    // Квоти для кожної зони
    let hideA = Math.floor(targetHidden * (zoneA.length / totalDigits));
    let hideB = Math.floor(targetHidden * (zoneB.length / totalDigits));
    let hideC = Math.floor(targetHidden * (zoneC.length / totalDigits));

    // РОЗУМНИЙ РОЗПОДІЛ ЗАЛИШКУ
    let remainder = targetHidden - (hideA + hideB + hideC);

    // Щоб зірочки з'являлися в умові, весь залишок віддаємо в зону А
    hideA += remainder;

    // Якщо цільових зірочок > 0, хоча б 1 МАЄ бути в множниках
    if (hideA === 0 && targetHidden > 0) {
        hideA = 1;
        if (hideB > 0) hideB--;
        else if (hideC > 0) hideC--;
    }

    // Сортуємо кожну зону за випадковою вагою
    zoneA.sort((a, b) => b.rand - a.rand);
    zoneB.sort((a, b) => b.rand - a.rand);
    zoneC.sort((a, b) => b.rand - a.rand);

    // Збираємо фінальні позиції для приховування
    let hiddenPos = [
        ...zoneA.slice(0, hideA),
        ...zoneB.slice(0, hideB),
        ...zoneC.slice(0, hideC)
    ];

    let masked = {
        M: String(structure.M).split(''),
        N: String(structure.N).split(''),
        partialProducts: structure.partialProducts.map(p => String(p).split('')),
        P: structure.partialProducts.length > 1 ? String(structure.P).split('') : null,
        original: structure
    };

    hiddenPos.forEach(pos => {
        if (pos.type === 'M') masked.M[pos.cIdx] = '*';
        else if (pos.type === 'N') masked.N[pos.cIdx] = '*';
        else if (pos.type === 'partial') masked.partialProducts[pos.rIdx][pos.cIdx] = '*';
        else if (pos.type === 'P') masked.P[pos.cIdx] = '*';
    });

    return masked;
}

// БЛОК CSP ТА BACKTRACKING

// Находит все скрытые цифры, задает возможные значения и передает данные солверу
function initializeDomains(masked) {
    let unassigned = [];
    let domains = new Map();

    const addVariables = (charsArray, type) => {
        charsArray.forEach((char, colIndex) => {
            if (char === '*') {
                let varId = `${type}_${colIndex}`;
                unassigned.push(varId);
                let domain = (colIndex === 0 && charsArray.length > 1)
                    ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
                    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                domains.set(varId, domain);
            }
        });
    };

    addVariables(masked.M, 'M');
    addVariables(masked.N, 'N');
    return { unassigned, domains };
}

// Скільки розв'язків знайдено (count)
function countSolutions(masked) {
    const { unassigned, domains } = initializeDomains(masked);
    let stats = { count: 0, backtracks: 0 };
    backtrackCount({}, unassigned, domains, masked, stats);
    return stats;
}

// Скільки тупиків зустрів алгоритм (backtracks)
function backtrackCount(assignment, unassigned, domains, masked, stats) {
    if (unassigned.length === 0) {
        if (verifyArithmetic(assignment, masked)) { stats.count++; }
        else { stats.backtracks++; }
        return;
    }

    if (stats.count >= 2) return;

    // Евристика MRV
    unassigned.sort((a, b) => {
        if (a.startsWith('M') && b.startsWith('N')) return -1;
        if (a.startsWith('N') && b.startsWith('M')) return 1;
        return domains.get(a).length - domains.get(b).length;
    });

    let varId = unassigned[0];
    let remainingUnassigned = unassigned.slice(1);

    let domainValues = domains.get(varId);
    let foundSolutionInBranch = false;

    for (let i = 0; i < domainValues.length; i++) {
        let newAssignment = { ...assignment, [varId]: domainValues[i] };

        // Раннє відсікання (Forward Checking)
        if (!quickPrune(newAssignment, varId, masked)) {
            stats.backtracks++;
            continue;
        }

        let prevCount = stats.count;
        backtrackCount(newAssignment, remainingUnassigned, domains, masked, stats);

        if (stats.count > prevCount) { foundSolutionInBranch = true; }
        else { stats.backtracks++; }

        if (stats.count >= 2) return;
    }
}

// Перевіряє, чи збігається результат із маскою відповідного часткового добутку
function quickPrune(assignment, varId, masked) {
    if (varId.startsWith('N')) {
        let mAssigned = true;
        let M_valStr = '';
        for (let i = 0; i < masked.M.length; i++) {
            if (masked.M[i] === '*') {
                if (assignment[`M_${i}`] === undefined) { mAssigned = false; break; }
                M_valStr += assignment[`M_${i}`];
            } else {
                M_valStr += masked.M[i];
            }
        }

        if (mAssigned) {
            let M_val = parseInt(M_valStr, 10);
            let nIdx = parseInt(varId.split('_')[1], 10);
            let reverseIdx = masked.N.length - 1 - nIdx;

            let nDigit = assignment[varId];
            let partialVal = M_val * nDigit;

            if (masked.partialProducts[reverseIdx]) {
                if (!matchesPattern(String(partialVal), masked.partialProducts[reverseIdx])) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Фінальна перевірка
function verifyArithmetic(assignment, masked) {
    const reconstructNumber = (patternArr, type) => {
        let numStr = '';
        for (let i = 0; i < patternArr.length; i++) {
            if (patternArr[i] === '*') numStr += assignment[`${type}_${i}`];
            else numStr += patternArr[i];
        }
        return parseInt(numStr, 10);
    };

    const M_val = reconstructNumber(masked.M, 'M');
    const N_val = reconstructNumber(masked.N, 'N');
    const P_val = M_val * N_val;

    if (masked.P && !matchesPattern(String(P_val), masked.P)) return false;

    const nDigits = String(N_val).split('').reverse().map(Number);
    if (nDigits.length !== masked.partialProducts.length) return false;

    for (let i = 0; i < nDigits.length; i++) {
        const partialVal = M_val * nDigits[i];
        if (!matchesPattern(String(partialVal), masked.partialProducts[i])) return false;
    }
    return true;
}

function matchesPattern(str, patternArr) {
    if (str.length !== patternArr.length) return false;
    for (let i = 0; i < str.length; i++) {
        if (patternArr[i] !== '*' && patternArr[i] !== str[i]) return false;
    }
    return true;
}

// Перевірка відповідності метрики BT(R) обраному рівню (Таблиці 1.3, 2.2)
function checkComplexity(stats, level) {
    const bt = stats.backtracks;
    if (level === 'easy') return bt >= 0 && bt <= 10;
    if (level === 'medium') return bt > 10 && bt <= 50;
    if (level === 'hard') return bt > 50;
    return false;
}

// Алгоритм 2.9: Повний цикл генерації ребусу (з гарантованою видачею результату)
function generateUniqueRebus(level) {
    const maxAttempts = 150;

    let fallbackRebus = null; // "Карман" для запасного варіанту
    let closestBTDiff = Infinity; // Наскільки ми близькі до ідеального BT

    // Визначаємо ідеальний цільовий BT для пошуку найкращого компромісу
    let targetBT = level === 'easy' ? 0 : (level === 'medium' ? 10 : 30);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let baseStructure = generateBasicExample(level);
        if (!baseStructure) continue;

        let masked = hideDigits(baseStructure, level);

        // Отримуємо статистику розв'язання { count, backtracks }
        let stats = countSolutions(masked);

        // Нам підходять тільки однозначні ребуси
        if (stats.count === 1) {
            masked.metrics = stats;

            // Перевіряємо, чи відповідає складність заданому рівню
            if (checkComplexity(stats, level)) {
                console.log(`[Ідеал] Рівень: ${level}. Спроб: ${attempt}. Метрика BT = ${stats.backtracks}`);
                return masked;
            } else {
                // Зберігаємо як запасний варіант
                let currentDiff = Math.abs(stats.backtracks - targetBT);
                if (currentDiff < closestBTDiff) {
                    closestBTDiff = currentDiff;
                    fallbackRebus = masked;
                }
            }
        }
    }

    // Якщо за 1000 спроб не знайшли ідеального за складністю
    if (fallbackRebus) {
        console.warn(`[Компроміс] Ідеальний BT не знайдено. Віддаємо запасний унікальний ребус. Рівень: ${level}. BT = ${fallbackRebus.metrics.backtracks}`);
        return fallbackRebus;
    }

    // Якщо не згенерувалося жодного однозначного ребусу
    return null;
}
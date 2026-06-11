// ==UserScript==
// @name         Travian Auto-Raid Calculator
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Розрахунок кількості військ та автоматична відправка рейду
// @author       You
// @match        https://*.travian.*/*
// @grant        none
// @run-at       document-idle
// @include        *://*.travian.*
// @include        *://*/*.travian.*

// ==/UserScript==

(function() {
    'use strict';

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Функція для пошуку елемента за XPath (використовується для фінальних кнопок)
    function getElementByXpath(path) {
        return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    async function runStep1() {
        // 1. Шукаємо ВСІ елементи з таким класом на сторінці
        const resSpans = document.querySelectorAll('.inlineIcon.resources span.value');

        // Перевіряємо, чи на сторінці є хоча б 6 таких елементів
        if (resSpans.length >= 6) {
            const sixthSpan = resSpans[5]; // <--- Беремо саме ШОСТИЙ елемент

            const rawValue = parseInt(sixthSpan.textContent.trim(), 10);
            if (isNaN(rawValue)) {
                console.error("Шостий елемент знайдено, але текст у ньому не є числом.");
                return;
            }

            // 2. Рахуємо X: цілочисельне ділення на 100 + 1
            const X = Math.floor(rawValue / 100) + 1;
            console.log(`Зчитано з 6-го елемента: ${rawValue}, Обчислено X = ${X}`);

            // Зберігаємо значення Х в пам'ять браузера
            localStorage.setItem('travian_raid_X', X);

        } else {
            console.error(`На сторінці знайдено лише ${resSpans.length} елементів resources, а потрібен шостий.`);
            return;
        }

        // 3. Знаходимо блок захисника (Defender)
        const defenderBox = document.querySelector('.role defender, div.role.defender');

        if (defenderBox) {
            // Шукаємо посилання виключно ВСЕРЕДИНІ цього блоку захисника
            const targetLink = defenderBox.querySelector('a[href*="gid=16"][href*="tt=2"]');

            if (targetLink) {
                console.log("Посилання в блоці Defender знайдено, переходжу за адресою:", targetLink.href);
                window.location.href = targetLink.href;
            } else {
                console.error("Помилка: Всередині блоку Defender не знайдено посилання з gid=16 та tt=2.");
            }
        } else {
            console.error("Критична помилка: Блок з класом <div class='role defender'> взагалі відсутній на сторінці.");
        }
    }

    async function runStep2() {
        // Перевіряємо, чи є в пам'яті збережене значення X
        const X = localStorage.getItem('travian_raid_X');
        if (!X) return; // Якщо немає, значить ми не починали процес автоматизації

        console.log(`Продовжуємо автоматизацію. Отримано X = ${X}`);

        // 1. Вставляємо значення X в інпут для Equites Imperatoris (t5)
        const troopInput = document.querySelector('input[name="troop[t5]"]');
        if (!troopInput) {
            console.error("Поле для введення військ t5 не знайдено.");
            return;
        }

        troopInput.value = X;
        // Тригеримо фокус та зміну, щоб гра зафіксувала введення даних
        troopInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`Введено ${X} у поле військ.`);

        await sleep(300);

        // 2. Вибираємо тип атаки: Набіг (Raid, value="4")
        const raidRadio = document.querySelector('input[type="radio"][name="eventType"][value="4"]');
        if (raidRadio) {
            raidRadio.click();
            console.log("Обрано тип атаки: Raid");
        }

        await sleep(400);

        // 3. Натискаємо кнопку ОK за допомогою XPath (//*[@id="ok"])
        const okButton = getElementByXpath('//*[@id="ok"]');
        if (okButton) {
            console.log("Натискаю OK (Далі)...");
            // Видаляємо X з пам'яті ПЕРЕД натисканням, щоб скрипт не зациклився
            localStorage.setItem('travian_raid_step3', 'true');
            okButton.click();
        }
    }

    async function runStep3() {
        // Перевіряємо, чи ми на фінальному етапі підтвердження
        if (localStorage.getItem('travian_raid_step3') === 'true') {
            localStorage.removeItem('travian_raid_X');
            localStorage.removeItem('travian_raid_step3');

            await sleep(500);

            // Натискаємо кнопку підтвердження за XPath
            const confirmButton = getElementByXpath('//*[@id="confirmSendTroops"]');
            if (confirmButton) {
                console.log("Фінал: Відправляю війська!");
                confirmButton.click();

                // Чекаємо 1.5 секунди, поки запит відправиться на сервер, і закриваємо вкладку
                await sleep(700);
                console.log("Рейд надіслано. Закриваю вкладку...");
                window.close();
            } else {
                console.error("Кнопку підтвердження відправки не знайдено.");
            }
        }
    }

    // Головний диспетчер, який визначає, на якому етапі перебуває гра
    async function main() {
        if (document.getElementById('confirmSendTroops')) {
            await runStep3();
        } else if (document.querySelector('input[name="troop[t5]"]')) {
            await runStep2();
        } else {
            // Додаємо кнопку запуску на першу сторінку, щоб автоматизація не відбувалася сама по собі
            createTriggerButton();
        }
    }

    function createTriggerButton() {
        if (document.getElementById('tm-raid-calc-btn')) return;
        if (!document.querySelector('.inlineIcon.resources')) return;

        const btn = document.createElement('button');
        btn.id = 'tm-raid-calc-btn';
        btn.innerText = '⚔️ РОЗРАХУВАТИ ТА ВІДПРАВИТИ';
        btn.style = 'position:fixed; top:120px; right:20px; z-index:9999999; padding:15px; background:darkorange; color:white; font-weight:bold; border-radius:5px; cursor:pointer; border:2px solid black;';
        btn.onclick = runStep1;
        document.body.appendChild(btn);
    }

    main();
})();

// ==UserScript==
// @name         Auto-Clicker with Confirmation
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Послідовне натискання кнопок із затримкою
// @author       Slalfik
// @match        https://вставте_сюди_адресу_сайту/*
// @grant        none
// @include        *://*.travcotools.*
// ==/UserScript==

(function() {
    'use strict';

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function startMassAutomation() {
        // Знаходимо ВСІ кнопки "Ignore target" на сторінці
        const allMainButtons = Array.from(document.querySelectorAll('button[data-original-title="Ignore target"], button[title="Ignore target"]'));

        if (allMainButtons.length === 0) {
            alert("Цілей для ігнорування не знайдено.");
            return;
        }

        console.log(`Знайдено цілей: ${allMainButtons.length}. Починаємо видалення...`);

        for (let i = 0; i < allMainButtons.length; i++) {
            let btn = allMainButtons[i];

            // Прокручуємо до кнопки, щоб бачити процес (опціонально)
            btn.scrollIntoView({ behavior: "smooth", block: "center" });

            console.log(`Обробка ${i + 1} з ${allMainButtons.length}...`);
            btn.click(); // Відкриваємо меню

            // Чекаємо появи кнопки підтвердження
            let confirmButton = null;
            for (let j = 0; j < 5; j++) {
                await sleep(300);
                confirmButton = [...document.querySelectorAll('.dropdown-menu.show button')]
                    .find(b => b.innerText.includes('Ignore'));
                if (confirmButton) break;
            }

            if (confirmButton) {
                confirmButton.click();
                console.log(`Ціль ${i + 1} видалена.`);
            } else {
                console.warn(`Не вдалося знайти підтвердження для цілі ${i + 1}.`);
            }

            // ПАУЗА між рядками.
            // 1000мс = 1 секунда. Не ставте менше 800мс, щоб сайт не "завис".
            await sleep(1000);
        }

        alert("Масове ігнорування завершено!");
    }

    // Створення кнопки запуску
    const uiInterval = setInterval(() => {
        if (document.getElementById('tm-mass-ignore-btn')) return;
        if (!document.body) return;

        const btn = document.createElement('button');
        btn.id = 'tm-mass-ignore-btn';
        btn.innerText = '💀 ВИДАЛИТИ ВСІ ЦІЛІ';
        btn.style = `
            position: fixed; top: 80px; right: 20px; z-index: 9999999;
            padding: 20px; background: black; color: yellow;
            font-weight: bold; border: 4px solid yellow;
            border-radius: 10px; cursor: pointer; font-size: 16px;
        `;
        btn.onclick = startMassAutomation;
        document.body.appendChild(btn);
    }, 2000);

})();

// ==UserScript==
// @name         Amazon Page Flipper with Auto-Download
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automates downloading from Amazon digital content pages, cycling through pages.
// @author       David Fantin
// @match        https://www.amazon.com/hz/mycd/digital-console/contentlist/*
// @grant        GM_addStyle
// @connect      amazon.com
// @connect      amazonaws.com
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    let currentPageNumber = new URLSearchParams(window.location.search).get('pageNumber') || 1;
    let largestPageNumber = 0;
    let cyclingInterval = null;
    let downloadFinished = false;

    function getLargestPageNumber() {
        const pageLinks = document.querySelectorAll('.page-item');
        let pageNumbers = [];

        pageLinks.forEach(link => {
            let num = parseInt(link.textContent.trim(), 10);
            if (!isNaN(num)) pageNumbers.push(num);
        });

        largestPageNumber = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
        console.log("Updated largest page number:", largestPageNumber);
    }

    async function processDropdowns() {
        const dropdowns = document.querySelectorAll('[class^="Dropdown-module_container__"]');

        for (let i = 0; i < dropdowns.length; i++) {
            const dropdown = dropdowns[i];
            dropdown.click();
            console.log(`Dropdown ${i + 1} opened`);

            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                let topDiv = Array.from(dropdown.querySelector('[class^="Dropdown-module_dropdown_container__"]').querySelectorAll('div'))
                    .find(div => div.textContent.includes('Download & transfer via USB'));

                if (topDiv) {
                    topDiv.querySelector('div').click();
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                let kindleSelection = dropdown.querySelector('span[id^="download_and_transfer_list_"]');
                if (kindleSelection) {
                    kindleSelection.click();
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                let confirmButton = Array.from(dropdown.querySelectorAll('[id$="_CONFIRM"]'))
                    .find(div => div.textContent.includes('Download'));

                if (confirmButton) {
                    confirmButton.click();
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                let closeNotification = document.querySelector('span[id="notification-close"]');
                if (closeNotification) {
                    closeNotification.click();
                }

                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.warn("Error processing dropdown:", error);
            }
        }

        downloadFinished = true;
        console.log('All dropdowns processed.');
    }

    function goToNextPage() {
        getLargestPageNumber();

        if (currentPageNumber >= largestPageNumber) {
            stopCycling();
            startButton.style.display = 'inline-block';
            return;
        }

        currentPageNumber++;
        console.log("Navigating to page:", currentPageNumber);

        setTimeout(() => {
            window.location.href = `https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc/?pageNumber=${currentPageNumber}`;
        }, 5000); // Longer delay before switching pages
    }

    function startCycling() {
        getLargestPageNumber();
        downloadFinished = false;

        (async function downloadLoop() {
            while (!downloadFinished) {
                console.log("Waiting for downloads to finish...");
                await processDropdowns();
            }
            console.log("Starting next page...");
            goToNextPage();
        })();

        sessionStorage.setItem('cyclingActive', 'true');
        console.log("Page cycling started.");
    }

    function stopCycling() {
        clearInterval(cyclingInterval);
        cyclingInterval = null;
        sessionStorage.removeItem('cyclingActive');
        console.log("Page cycling stopped.");
    }

    const startButton = document.createElement('button');
    startButton.textContent = 'Start Page Cycling';
    Object.assign(startButton.style, {
        position: 'fixed', top: '10px', left: '10px', padding: '10px',
        zIndex: '1000', backgroundColor: 'green', color: 'white',
        border: 'none', cursor: 'pointer'
    });
    document.body.appendChild(startButton);

    const stopButton = document.createElement('button');
    stopButton.textContent = 'Stop Page Cycling';
    Object.assign(stopButton.style, {
        position: 'fixed', top: '10px', left: '160px', padding: '10px',
        zIndex: '1000', backgroundColor: 'red', color: 'white',
        border: 'none', cursor: 'pointer'
    });
    document.body.appendChild(stopButton);

    startButton.addEventListener('click', () => {
        startCycling();
        startButton.style.display = 'none';
    });

    stopButton.addEventListener('click', () => {
        stopCycling();
        startButton.style.display = 'inline-block';
    });

    if (sessionStorage.getItem('cyclingActive') === 'true') {
        startCycling();
        startButton.style.display = 'none';
    }
})();

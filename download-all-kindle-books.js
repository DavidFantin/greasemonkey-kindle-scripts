// ==UserScript==
// @name         Page Flipper (Cycle by URL with Start/Stop)
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Cycle through pages by updating the URL based on the largest page number, after processing dropdowns, with manual Start and Stop control.
// @author       David Fantin
// @match        https://www.amazon.com/hz/mycd/digital-console/contentlist/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(async function() {
    'use strict';

    // Get the current page number from the URL.
    const urlParams = new URLSearchParams(window.location.search);
    let currentPageNumber = parseInt(urlParams.get('pageNumber')) || 1;
    let largestPageNumber = 0;
    let cyclingInterval = null;
    let downloadFinished = false;

    // Update the largest page number from the pagination elements.
    function getLargestPageNumber() {
        const pageLinks = document.querySelectorAll('.page-item');
        const pageNumbers = [];
        pageLinks.forEach(link => {
            const textContent = link.textContent.trim();
            if (!isNaN(textContent) && textContent !== '') {
                pageNumbers.push(parseInt(textContent, 10));
            }
        });
        if (pageNumbers.length > 0) {
            largestPageNumber = Math.max(...pageNumbers);
        }
        console.log("Updated largest page number:", largestPageNumber);
    }

    // Navigate to the next page.
    function goToNextPage() {
        getLargestPageNumber(); // In case the number changes.
        currentPageNumber++;

        // If we exceed the last page, stop cycling.
        if (currentPageNumber > largestPageNumber) {
            stopCycling();
            startButton.style.display = 'inline-block';
            return;
        }

        console.log("Navigating to page:", currentPageNumber);
        setTimeout(() => {
            window.location.href = `https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc/?pageNumber=${currentPageNumber}`;
        }, 2000);
    }

    // Process the download dropdowns. This function simulates your download process.
    async function processDropdowns() {
        const dropdowns = document.querySelectorAll('[class^="Dropdown-module_container__"]');
        for (let i = 0; i < dropdowns.length; i++) {
            const dropdown = dropdowns[i];
            dropdown.click();
            console.log(`Dropdown ${i + 1} opened`);
            await new Promise(resolve => setTimeout(resolve, 500));

            await new Promise(resolve => setTimeout(() => {
                const container = dropdown.querySelector('[class^="Dropdown-module_dropdown_container__"]');
                if (container) {
                    const topDiv = Array.from(container.querySelectorAll('div'))
                        .find(div => div.textContent.includes('Download & transfer via USB'));
                    if (topDiv && topDiv.querySelector('div')) {
                        topDiv.querySelector('div').click();
                    }
                }
                resolve();
            }, 500));

            await new Promise(resolve => setTimeout(resolve, 500));

            await new Promise(resolve => setTimeout(() => {
                const element = dropdown.querySelector('span[id^="download_and_transfer_list_"]');
                if (element) element.click();
                resolve();
            }, 500));

            await new Promise(resolve => setTimeout(resolve, 500));

            await new Promise(resolve => setTimeout(() => {
                const confirmDiv = Array.from(dropdown.querySelectorAll('[id$="_CONFIRM"]'))
                    .find(div => div.textContent.includes('Download'));
                if (confirmDiv) confirmDiv.click();
                resolve();
            }, 500));

            await new Promise(resolve => setTimeout(resolve, 500));

            await new Promise(resolve => setTimeout(() => {
                const closeBtn = document.querySelector('span[id="notification-close"]');
                if (closeBtn) closeBtn.click();
                resolve();
            }, 500));

            // Wait a little before processing the next dropdown.
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        downloadFinished = true;
        console.log('All dropdowns processed');
    }

    // Start the cycling process. First, it processes the downloads,
    // then—once complete—it starts cycling pages.
    async function startCycling() {
        getLargestPageNumber();
        downloadFinished = false; // Reset flag.

        console.log("Starting download process...");
        // Process dropdowns automatically (no extra button needed).
        await processDropdowns();
        console.log("Download process finished, starting page cycling.");

        cyclingInterval = setInterval(goToNextPage, 5000); // Cycle every 5 seconds.
        sessionStorage.setItem('cyclingActive', 'true');
        console.log("Page cycling started.");
    }

    // Stop cycling.
    function stopCycling() {
        if (cyclingInterval) {
            clearInterval(cyclingInterval);
            cyclingInterval = null;
            sessionStorage.removeItem('cyclingActive');
            console.log("Page cycling stopped.");
        }
    }

    // Create the "Start Page Cycling" button.
    const startButton = document.createElement('button');
    startButton.textContent = 'Start Page Cycling';
    Object.assign(startButton.style, {
        position: 'fixed',
        top: '10px',
        left: '10px',
        padding: '10px',
        zIndex: '1000',
        backgroundColor: 'green',
        color: 'white',
        border: 'none',
        cursor: 'pointer'
    });
    document.body.appendChild(startButton);

    // Create the "Stop Page Cycling" button.
    const stopButton = document.createElement('button');
    stopButton.textContent = 'Stop Page Cycling';
    Object.assign(stopButton.style, {
        position: 'fixed',
        top: '10px',
        left: '160px',
        padding: '10px',
        zIndex: '1000',
        backgroundColor: 'red',
        color: 'white',
        border: 'none',
        cursor: 'pointer'
    });
    document.body.appendChild(stopButton);

    // When the Start button is clicked, begin the download process then page cycling.
    startButton.addEventListener('click', () => {
        startCycling();
        startButton.style.display = 'none';
    });

    // When the Stop button is clicked, stop page cycling.
    stopButton.addEventListener('click', () => {
        stopCycling();
        startButton.style.display = 'inline-block';
    });

    // On page load, if cycling was active, resume it automatically.
    if (sessionStorage.getItem('cyclingActive') === 'true') {
        startCycling();
        startButton.style.display = 'none';
    }
})();

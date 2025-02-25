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

    let downloadFinished = false;
    let cyclingInterval = null;
    const urlParams = new URLSearchParams(window.location.search);
    let currentPageNumber = parseInt(urlParams.get('pageNumber')) || 1;

    function logStep(step, success = true) {
        console.log(success ? `✅ ${step} - SUCCESS` : `❌ ${step} - FAILED`);
    }

    async function waitForElement(selector, timeout = 5000) {
        let timeElapsed = 0;
        while (timeElapsed < timeout) {
            const element = document.querySelector(selector);
            if (element) return element;
            await new Promise(resolve => setTimeout(resolve, 500));
            timeElapsed += 500;
        }
        return null;
    }

    async function processDropdowns() {
        console.log("Starting download process...");

        const dropdowns = document.querySelectorAll('[class^="Dropdown-module_container__"]');
        if (dropdowns.length === 0) {
            logStep("No dropdowns found", false);
            return;
        }

        for (let i = 0; i < dropdowns.length; i++) {
            const dropdown = dropdowns[i];
            dropdown.click();
            logStep(`Dropdown ${i + 1} opened`);

            await new Promise(resolve => setTimeout(resolve, 500));

            const container = await waitForElement('[class^="Dropdown-module_dropdown_container__"]');
            if (!container) continue;

            const downloadOption = Array.from(container.querySelectorAll('div'))
                .find(div => div.textContent.includes('Download & transfer via USB'));
            if (downloadOption) {
                downloadOption.click();
                logStep("Download & transfer option clicked");
            } else {
                logStep("Download & transfer option not found", false);
                continue;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const deviceSelection = await waitForElement('span[id^="download_and_transfer_list_"]');
            if (deviceSelection) {
                deviceSelection.click();
                logStep("Kindle device selected");
            } else {
                logStep("No Kindle device found", false);
                continue;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const confirmButton = Array.from(container.querySelectorAll('[id$="_CONFIRM"]'))
                .find(div => div.textContent.includes('Download'));
            if (confirmButton) {
                confirmButton.click();
                logStep("Download confirmed");
            } else {
                logStep("Confirm button not found", false);
                continue;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const closeNotification = await waitForElement('span[id="notification-close"]');
            if (closeNotification) {
                closeNotification.click();
                logStep("Success notification closed");
            } else {
                logStep("Notification close button not found", false);
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        downloadFinished = true;
        console.log("All dropdowns processed");
        goToNextPage(); // Now, go to the next page only after downloads finish
    }

    function goToNextPage() {
        if (!downloadFinished) {
            console.log("Waiting for downloads to finish before flipping page...");
            return;
        }

        currentPageNumber++;
        console.log("Navigating to page:", currentPageNumber);

        // Reset flag so downloads happen on the next page
        downloadFinished = false;

        setTimeout(() => {
            window.location.href = `https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc/?pageNumber=${currentPageNumber}`;
        }, 2000);
    }

    async function startCycling() {
        getLargestPageNumber();
        downloadFinished = false;

        while (!downloadFinished) {
            console.log("Waiting before starting downloads on new page...");
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay before starting downloads

            await processDropdowns(); // Start downloads
    }

    cyclingInterval = setInterval(goToNextPage, 5000); // Cycle every 5 seconds
    sessionStorage.setItem('cyclingActive', 'true'); // Flag to auto-resume cycling
    console.log("Page cycling started.");
}

    function stopCycling() {
        clearInterval(cyclingInterval);
        console.log("Stopped page cycling");
    }

    const startButton = document.createElement('button');
    startButton.textContent = 'Start Download & Flip';
    Object.assign(startButton.style, {
        position: 'fixed',
        top: '10px',
        left: '10px',
        padding: '10px',
        backgroundColor: 'green',
        color: 'white',
        border: 'none',
        cursor: 'pointer'
    });
    document.body.appendChild(startButton);

    const stopButton = document.createElement('button');
    stopButton.textContent = 'Stop';
    Object.assign(stopButton.style, {
        position: 'fixed',
        top: '10px',
        left: '160px',
        padding: '10px',
        backgroundColor: 'red',
        color: 'white',
        border: 'none',
        cursor: 'pointer'
    });
    document.body.appendChild(stopButton);

    startButton.addEventListener('click', startCycling);
    stopButton.addEventListener('click', stopCycling);

    // Auto restart process on new page
    if (window.location.href.includes("pageNumber=")) {
        console.log("Restarting downloads on new page...");
        startCycling();
    }

})();

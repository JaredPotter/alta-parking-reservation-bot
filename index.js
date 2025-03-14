const { spawn, spawnSync } = require('child_process');
const crossSpawn = require('cross-spawn');
const crossSpawnSync = crossSpawn.sync;
const cron = require('node-cron');
const puppeteer = require('puppeteer');
const moment = require('moment');
const axios = require('axios');
const fs = require('fs-extra');
const exiftool = require('node-exiftool');
const exiftoolProcess = new exiftool.ExiftoolProcess();
const dotenv = require('dotenv');
dotenv.config();
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const toNumber = process.env.TWILIO_TO_NUMBER;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

const client = twilio(accountSid, authToken);

const WINDOW_HEIGHT = 1000;
const WINDOW_WIDTH = 1000;

let chromeLauncher = '';
let chromeLauncherFlags = [];

// FULL LIST OF chromium FLAGS
// https://peter.sh/experiments/chromium-command-line-switches/#load-extension

async function startChromeProcess(chromeLauncher, chromeLauncherFlags) {
    // Starts Chrome
    try {
        const chromeStartCommand = `${chromeLauncher} ${chromeLauncherFlags.join(
            ' '
        )}`;
        console.log(`Running \n${chromeStartCommand}`);

        if (process.platform === 'win32') {
            crossSpawnSync(chromeStartCommand, { stdio: 'inherit' });
        } else if (process.platform === 'darwin') {
            spawn(chromeLauncher, chromeLauncherFlags, { stdio: 'inherit', windowsVerbatimArguments: true });
        }
    } catch (error) {
        // do nothing.
    }


    await sleep(2500);
    let isWaiting = true;

    while (isWaiting) {
        try {
            console.log('Fetching webSocket URL...');
            const response = await axios.get('http://localhost:9222/json/version');
            const data = response.data;
            const webSocketDebuggerUrl = data.webSocketDebuggerUrl;

            console.log('WebSocket URL - ' + webSocketDebuggerUrl);

            return webSocketDebuggerUrl;
        } catch (error) {
            console.log('Request failed. Exiting now.');
        }

        console.log('waiting for Chrome to finish launching...');
        await sleep(1000);
    }
}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });
}

async function openChromeAndConnectPuppeteer() {
    let wsChromeEndpointUrl = '';
    let port = 9222;



    if (process.platform === 'win32') {
        console.log('Running on Windows');

        crossSpawnSync('powershell', ['kill', '-n', 'chrome']);
        await sleep(2500);

        chromeLauncher = 'start';
        chromeLauncherFlags = [
            'chrome.exe',
            `--remote-debugging-port=${port}`,
            '--no-first-run',
            '--no-default-browser-check',
            `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
        ];

        wsChromeEndpointUrl = await startChromeProcess(
            chromeLauncher,
            chromeLauncherFlags
        );
    } else if (process.platform === 'darwin') {
        console.log('Running on Mac');
        spawnSync('killall', [`Google Chrome`]);
        chromeLauncher = `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`;
        chromeLauncherFlags = [
            `--remote-debugging-port=${port}`,
            '--no-first-run',
            '--no-default-browser-check',
            `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
            '--user-data-dir=./temp-user-data'
        ];

        await sleep(2000);

        wsChromeEndpointUrl = await startChromeProcess(
            chromeLauncher,
            chromeLauncherFlags
        );
        console.log('wsChromeEndpointUrl', wsChromeEndpointUrl);
    }

    if (!wsChromeEndpointUrl) {
        console.log('Failed to load websocket URL. Exiting now!');
        return;
    }

    const browser = await puppeteer.connect({
        browserWSEndpoint: wsChromeEndpointUrl,
        // defaultViewport: {
        //     width: WINDOW_WIDTH,
        //     height: WINDOW_HEIGHT,
        // },
    });

    const page = await browser.newPage();

    // await page.setViewport({
    //     width: WINDOW_WIDTH,
    //     height: WINDOW_HEIGHT,
    // });

    await sleep(1000);

    return page;
}

async function closeChrome() {
    if (process.platform === 'win32') {
        crossSpawnSync('powershell', ['kill', '-n', 'chrome']);
    } else if (process.platform === 'darwin') {
        crossSpawnSync('killall', [`Google Chrome`]);
    }
}

// async function makeParkingReservation(page, username, password, parkingCode, date) {
//     await page.goto('https://reserve.altaparking.com/login', {
//         waitUntil: 'networkidle0',
//     });

//     console.log('blah '.page, username, password, parkingCode, date)

//     const currentPageUrl = await page.url();

//     if (currentPageUrl === "https://reserve.altaparking.com/login") {
//         await page.waitForSelector('#emailAddress');

//         const emailInputElement = await page.$('#emailAddress');
//         await emailInputElement.type(username);

//         const passwordInputElement = await page.$('#password');
//         await passwordInputElement.type(password);

//         const loginButtonElement = await page.$('button[type="submit"]');
//         await loginButtonElement.click();

//         await sleep(5000);
//     }

//     // Check if date is already reserved
//     const momentDate = moment(date, 'MM-DD-YYYY');

//     await page.goto('https://reserve.altaparking.com/parking-reservations', {
//         waitUntil: 'networkidle0',
//     });

//     const reservationDateElements = await page.$$('.text-muted');

//     for (const reservationDateElement of reservationDateElements) {
//         const reservationDate = await reservationDateElement.evaluate(el => el.textContent);
//         const momentReservationDate = moment(reservationDate, 'MMM D, yyyy');

//         if (momentReservationDate.isSame(momentDate, 'day')) {
//             console.log('Date Already Reserved! - ' + reservationDate);
//             return;
//         }
//     }

//     // Otherwise Attempt to Make Reservation

//     const redeemParkingCodeElement = reservations[1];
//     await redeemParkingCodeElement.click();

//     // await page.goto('https://reserve.altaparking.com/parking-codes', {
//     //     waitUntil: 'networkidle0',
//     // });

//     // const reserveParkingButtonElement = await page.$('button[type="button"]');
//     // await reserveParkingButtonElement.click();

//     await page.goto('https://reserve.altaparking.com/select-parking', {
//         waitUntil: 'networkidle0',
//     });

//     const formattedDate = momentDate.format('dddd, MMMM D');
//     const selectorString = `div[aria-label="${formattedDate}"]`;
//     const calendarDateElement = await page.$(selectorString);

//     await calendarDateElement.click();

//     await sleep(2000);
//     let pageString = await page.content();

//     if (pageString.includes('<div>Redeem Parking Code</div>')) {
//         const purchaseOptions = await page.$$('div[class^=Card_card]');
//         const redeemParkingCodeElement = purchaseOptions[1];
//         await redeemParkingCodeElement.click();

//         const parkkingCodeInputElement = await page.$('#promoCode');
//         await parkkingCodeInputElement.type(parkingCode);

//         const submitButtonElement = await page.$('button[type="submit"]');
//         await submitButtonElement.click();
//     }
// }

async function checkParkingAvailability(page, targetDate) {
    // Create a promise that will resolve when we get the response we want
    let isWaiting = true;

    page.on('response', async response => {
        const url = response.url();
        if (url.includes('platform.honkmobile.com/graphql')) {
            try {
                const responseData = await response.json();
                if (responseData.data?.publicParkingAvailability) {
                    // Get all dates from the response
                    const dates = Object.keys(responseData.data.publicParkingAvailability);

                    console.log('targetDate: ', targetDate);
                    // Find if any date starts with our target date
                    const matchingDate = dates.find(date => date.startsWith(targetDate));

                    if (matchingDate) {
                        const dateData = responseData.data.publicParkingAvailability[matchingDate];

                        if (dateData && dateData.status && !dateData.status.sold_out) {
                            console.log('SUCCESS: Found matching date and parking is available!');
                            await sendTextMessage(`SUCCESS: Found matching date for ${targetDate} and parking is available!`);
                            isWaiting = false;
                        } else {
                            console.log('Found matching date but parking is sold out.');
                        }
                    } else {
                        console.log('No matching date found.');
                    }
                }
            } catch (error) {
                console.log('Failed to parse response:', error);
            }
        }
    });


    while (isWaiting) {
        console.log('refreshing page...');
        try {
            await page.goto('https://reserve.altaparking.com/select-parking', {
                waitUntil: 'networkidle0',
            });
        } catch (error) {
            // do nothing
        }

        await sleep(5000);
    }
}

async function sendTextMessage(message) {
    await client.messages.create({
        from: fromNumber,
        to: toNumber,
        contentVariables: JSON.stringify({
            1: message
        }),
        contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
    });
}

// DEV ONLY
const targetDate = process.argv[2];

if (targetDate) {
    (async () => {
        const targetDate = process.argv[2];

        if (!isValidDateFormat(targetDate)) {
            console.log('Invalid date format. Please use YYYY-MM-DD format. Ex. 2025-02-17');
            return;
        }

        await sendTextMessage(`Starting to look for parking on ${targetDate}!`);

        const page = await openChromeAndConnectPuppeteer();
        await checkParkingAvailability(page, targetDate)
    })();
}

if (!targetDate) {
    console.log('SUCCESSFUL START');

    // cron.schedule('0,15,30,45 * * * *', async () => {
    // cron.schedule('0,15,30,45 * * * *', async () => {
    console.log('TIME TO RUN');
    // const page = await openChromeAndConnectPuppeteer();

    // const reservation = await makeParkingReservation(
    //     page,
    //     process.env.EMAIL,
    //     process.env.PASSWORD,
    //     "SP16ST8NN",
    //     "01-02-2023"
    // );

    // await closeChrome();
    // });
}

function isValidDateFormat(dateString) {
    // Regular expression to match YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(dateString);
}

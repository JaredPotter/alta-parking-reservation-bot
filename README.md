1. Setup the .env file with your credentials

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_TO_NUMBER=whatsapp:+15555555555
TWILIO_FROM_NUMBER=whatsapp:+15555555555
```

2. I'm using Node v20.4.0 but hopefully any modern-ish version will work (install with nvm)

3. Run the script

```
yarn install
yarn start 2025-02-17
```

This will 1.) launch a special instances of chrome with a debugging port available, 2.) Puppeteer will connect to that new browser instance, 3.) Puppeteer navigates to the Alte parking reservation page (https://reserve.altaparking.com/select-parking) to check for the availability of the target date. If the target date is available, it will send a WhatsAppmessage to the phone number you specified in the .env file. If not, the script will wait 5 seconds and then refresh the page and check again. 
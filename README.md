# Cradle Ceremony Invitation Website

A mobile-friendly, South Indian traditional-style invitation for the cradle ceremony of Vijender & Mounika.

## Included

- GitHub Pages static website
- Ceremony details and countdown
- Google Maps directions
- RSVP form with vegetarian and non-vegetarian headcounts
- Google Sheets storage through Google Apps Script
- RSVP updates using RSVP ID + original phone number
- WhatsApp invitation sharing and host notification link
- Optional background music (add your own licensed MP3)
- Private Google Sheets dashboard with catering totals

## Event details already configured

- Date: Saturday, November 21, 2026
- Time: 6:00 PM (Arizona time)
- Venue: 7441 W Buckhorn Trl, Peoria, AZ 85383
- Hosts: Vijender & Mounika

## Part A — Create the private Google Sheet

1. Sign in to the Google account that will own the RSVP list.
2. Create a blank Google Sheet, for example `Cradle Ceremony RSVPs`.
3. Copy the spreadsheet ID from its URL. It is the long value between `/d/` and `/edit`.
4. Open **Extensions → Apps Script**.
5. Replace the editor contents with `Code.gs` from this project.
6. In `Code.gs`, replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE` with the spreadsheet ID.
7. Save the project.
8. Select the `setup` function and click **Run**. Approve the requested Google permissions.
9. Return to the spreadsheet. It should now contain:
   - `Dashboard` — RSVP submission count and meal totals
   - `RSVP Responses` — individual RSVP records

Keep this spreadsheet private. Do not publish it or share it with guests.

## Part B — Deploy the Apps Script web app

1. In Apps Script, click **Deploy → New deployment**.
2. Select the gear icon and choose **Web app**.
3. Description: `Cradle Ceremony RSVP`.
4. Execute as: **Me**.
5. Who has access: **Anyone**.
6. Click **Deploy** and authorize if prompted.
7. Copy the web app URL ending in `/exec`.

The public endpoint accepts only RSVP submissions and updates. It does not provide a public method to read or download guest records.

### Important deployment note

The static GitHub Pages site sends a simple form POST to Apps Script. The browser uses `no-cors` because Apps Script web-app responses may redirect across Google domains. As a result, the page can confirm that the request was sent, but cannot read the server's response. Check the private `RSVP Responses` sheet after a test submission to verify that it arrived. If you change the Apps Script code later, create a new deployment version using **Deploy → Manage deployments → Edit → New version**.

## Part C — Configure the website

Open `config.js` and replace:

```js
APPS_SCRIPT_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",
HOST_WHATSAPP: "REPLACE_WITH_YOUR_WHATSAPP_NUMBER",
```

- `APPS_SCRIPT_URL`: paste the Apps Script `/exec` URL.
- `HOST_WHATSAPP`: your WhatsApp number in international digits-only format. Example format: `16025551234`. Do not include `+`, spaces, or dashes.

The phone number is used to build a WhatsApp message link. The website does not send WhatsApp messages automatically; the guest must tap the WhatsApp button and press Send.

## Part D — Add optional background music

Add an MP3 that you own or are licensed to use at:

`assets/ceremony-music.mp3`

The player is user-controlled; music does not autoplay. Do not add copyrighted music unless you have permission to use it.

## Part E — Publish using GitHub Pages

1. Create a new **public** GitHub repository, for example `cradle-ceremony`.
2. Upload all project files and the `assets` folder, preserving the folder structure:
   - `index.html`
   - `styles.css`
   - `config.js`
   - `script.js`
   - `Code.gs` (keep this in the repo only if you are comfortable with it being public; it contains no sheet ID after setup, but you may instead keep it locally)
   - `README.md`
   - `assets/` (and your optional MP3)
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then Save.
6. Wait for the deployment. Your site will be:
   `https://YOUR-GITHUB-USERNAME.github.io/cradle-ceremony/`

You can also test the site locally by opening `index.html`, but the Google Apps Script integration should be tested from the deployed HTTPS GitHub Pages URL.

## Part F — Test before sharing

Use a test RSVP first, with a phone number you control.

1. Submit a new RSVP with (for example) 2 vegetarian and 1 non-vegetarian guest.
2. Confirm one new row appears in `RSVP Responses`.
3. Copy the generated RSVP ID from the confirmation on the website.
4. Choose **Update RSVP**, enter the RSVP ID and the same phone number, and change the counts.
5. Confirm the same row is updated rather than a duplicate being added.
6. Check the Dashboard totals.
7. Tap the WhatsApp notification link and verify the prefilled message and recipient.

Delete your test row before sharing the invitation publicly.

## Privacy and security notes

- The Google Sheet must remain private.
- The Apps Script web app is publicly callable, so anyone who knows the endpoint can attempt to submit data. The script validates fields and does not expose guest data, but this is not strong anti-spam protection. For a larger public event, consider adding CAPTCHA or a managed backend with rate limiting.
- RSVP ID plus phone number is a basic update check, not high-assurance authentication. Guests should not post their RSVP ID publicly.
- Do not commit private spreadsheet IDs, credentials, API keys, or other secrets to the public repository.
- `Code.gs` can be kept outside the public repository after you paste it into Apps Script.

## Customization

- Invitation wording and layout: `index.html`
- Colors, spacing, mobile layout: `styles.css`
- Apps Script URL and WhatsApp number: `config.js`
- RSVP behavior and countdown: `script.js`
- Google Sheet logic and dashboard: `Code.gs`

## Troubleshooting

**RSVP doesn't appear in Sheets**
- Confirm the `/exec` URL is correct in `config.js`.
- Confirm the Apps Script deployment is set to execute as you and accessible to anyone.
- Check Apps Script → Executions for errors.
- Make sure `setup()` has been run and the spreadsheet ID is correct.

**Changes to Apps Script are not reflected**
- Deploy a new version of the web app; saving code alone does not update an existing deployment.

**WhatsApp button doesn't open the correct chat**
- Check `HOST_WHATSAPP` in `config.js`; use country code + number, digits only.

**Music doesn't play**
- Add `assets/ceremony-music.mp3`. Browsers require a user click before playback.

# Kiran Channel Partner — website

Static single-page site for [kiranchannelpartner.in](https://kiranchannelpartner.in/), served by GitHub Pages (`CNAME`). There is no build step: edit the files and push.

```
index.html              Page markup, SEO/Open Graph tags, legal dialogs
assets/css/styles.css   Design system and all styles
assets/js/main.js       Navigation, site-visit form, WhatsApp hand-off, dialogs
assets/fonts/           Self-hosted Cormorant Garamond + Manrope (SIL OFL)
assets/img/             Original architectural line illustrations (SVG)
og-image.jpg            Social share preview (1200 × 630)
favicon.svg, apple-touch-icon.png
robots.txt, sitemap.xml
```

To preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.

## Things to update

| What | Where |
| --- | --- |
| WhatsApp number (`15553680842`) | `WA_NUMBER` in `assets/js/main.js` **and** every `wa.me/15553680842` link in `index.html` (search and replace) |
| Phone, email, address, hours | `index.html` (top bar, contact section, footer, JSON-LD block in `<head>`) |
| TS-RERA agent registration number | Marked with a `TODO` comment in the footer of `index.html` |
| Property photos | Replace `assets/img/kompally.svg` / `shadnagar-plan.svg` with real, licensed project images (keep the `width`/`height`/`alt` attributes accurate) |

## Site-visit form → Google Sheets

The form posts to the existing Google Apps Script web app (the `action` URL on `#siteVisitForm`). Each submission sends one `application/x-www-form-urlencoded` POST with these fields:

`fullName, phoneNum, preferredLoc, reqOrDate, timestamp, name, phone, mobile, location, preferredLocation, requirements, message`

`reqOrDate` holds the requirements text, the preferred visit date (as `Preferred date: …`), or both joined by ` | `. Apps Script does not return CORS headers, so the site can only detect network failures; it shows an error with a WhatsApp fallback when the request cannot be sent.

### Setup guide (moved here from the public contact form)

If form responses are not appearing in your Google Sheet, verify that your Apps Script project has this exact code deployed:

**1. Correct Google Apps Script code (`Code.gs`)**

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var p = e.parameter;

  sheet.appendRow([
    p.timestamp || new Date(),
    p.fullName || p.name || "",
    p.phoneNum || p.phone || p.mobile || "",
    p.preferredLoc || p.location || "",
    p.reqOrDate || p.message || p.requirements || ""
  ]);

  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
```

**2. Mandatory deployment settings**

- Click **Deploy → New deployment** in Google Apps Script.
- Select type: **Web App**.
- Execute as: **Me (your email)**.
- Who has access: **Anyone** (crucial for receiving submissions).

If you redeploy and the web-app URL changes, update the form's `action` attribute in `index.html`.

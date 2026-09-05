# Campus Store - Order Booking Web Application

A modern, responsive e-commerce and order booking portal designed for university and college campuses. Allows students to order academic stationery, gym gear, tech accessories, and hostel essentials with hostel room delivery within 2 business days.

---

## 🚀 Features

- **No Mandatory Login**: Students can browse all items and check out as a **Guest** or sign in with their **Student ID**.
- **Delivery Timeline**: Estimated **Within 2 Business Days Delivery** across campus hostels.
- **Product Catalog**:
  - **Stationary Essentials**: Universal Science practical notebooks (144 & 200 pages with front/back preview covers), assignment sheets, pens, and calculator cases.
  - **Gym Essentials**: Heavy-duty wrist bands, cylindrical duffel bags with shoe compartments, leatherette weightlifting gloves, and 3-compartment shakers.
  - **Laptop Accessories**: Wired/wireless keyboards and mice, cooling pads with stands, and high-speed 32GB/64GB USB drives.
  - **Hostel Essentials**: 4-socket surge protectors, electric kettles, LED desk lamps, laundry hampers, and cotton bedsheets.
- **Payment Processing**:
  - **State Bank of India (SBI)** Direct Bank Transfer (A/C: `43626003401`, IFSC: `SBIN0051455`).
  - **UPI Direct Payments**: Dynamic UPI QR code generated for exact order total, plus Google Pay (`singhharpreet5975@okaxis`) and PhonePe (`7009918303@ybl`) 1-click copy badges.
  - **Verification**: 12-digit UTR/Transaction reference verification.
- **Automated Order Dispatch**:
  - **Email**: Automatic real-time notification sent to `singhharpreet5975@gmail.com` with full order breakdown.
  - **WhatsApp**: 1-Click WhatsApp dispatch button to send pre-formatted order ticket to `+91 70099 18303`.
- **Contact Us Helpdesk**:
  - Direct inquiry form submitting to `singhharpreet5975@gmail.com`.

---

## 📁 Project Structure

```
├── index.html          # Main single-page web app
├── css/
│   └── styles.css      # Responsive styles & theme
├── js/
│   ├── products.js     # Product catalog & pricing database
│   └── app.js          # Cart, checkout, payment, & notification engine
├── assets/
│   └── images/         # High-resolution product photos & covers
├── server.py           # Optional Python local HTTP server
└── README.md           # Project documentation
```

---

## 💻 Running Locally

You can run this project locally without any dependencies or build step:

### Option 1: Using Python
```bash
python3 server.py
```
Open **`http://localhost:8080`** in your browser.

### Option 2: Using Any Static Server
```bash
npx serve .
# or
php -S localhost:8080
```
*(Or simply double click `index.html` to open in any web browser).*

---

## 🌐 Free Public Hosting (Deploy in 30 Seconds)

### 1. Netlify Drop (Fastest)
1. Open **[app.netlify.com/drop](https://app.netlify.com/drop)**.
2. Drag and drop this folder or `campus_store_website.zip`.
3. Your site is live instantly with an HTTPS link (e.g. `https://campus-store.netlify.app`).

### 2. GitHub Pages
1. Push this folder to a GitHub repository.
2. Go to **Settings > Pages > Branch: `main` > Save**.
3. Live URL: `https://<username>.github.io/<repo-name>/`.

### 3. Vercel
1. Sign in to **[vercel.com](https://vercel.com)**.
2. Import the project folder / repository and click **Deploy**.

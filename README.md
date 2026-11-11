# TSC Cafeteria - Restaurant POS & Management System

A full-stack, enterprise-grade Point of Sale (POS) and Restaurant Management solution built for modern dining operations, fast food, and cafeteria environments.

---

## 🌟 Key Features

- **Point of Sale (POS) Billing:** Fast, touch-friendly order entry, table ordering, takeaway, discount handling, and split bills.
- **Kitchen Order Tickets (KOT):** Real-time order routing to kitchen displays and ESC/POS thermal ticket printers.
- **Shift & Day-End Reporting:** Automated Shift Z-Reports and Daily Consolidated Day-End Master Reports with auto-cut printer support.
- **Dual Data Persistence:** Seamless cloud synchronization with **MongoDB Atlas** and automatic local offline JSON fallback (`restaurant_data.json`).
- **Hardware Integration:**
  - **Thermal Receipt Printers:** Native Windows ESC/POS thermal printing support via USB and LAN.
  - **Biometric Attendance (HR):** Direct network synchronization with ZKTeco (ZKLib) biometric fingerprint/card attendance devices.
- **AI Chef & Recipe Assistant:** Powered by **Google Gemini AI** for ingredient costing, menu suggestion, and recipe optimization.
- **Inventory & Supply Management:** Real-time ingredient stock deduction, low-stock alerts, and recipe batch costing.
- **Role-Based Access Control:** Configurable permissions for Admin, Cashier, Waiter, and Kitchen staff.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Motion, Lucide Icons
- **Backend:** Node.js (>=20.19.0), Express, TypeScript / esbuild
- **Database:** MongoDB Atlas (Mongoose) + Offline JSON synchronization
- **Hardware & Peripherals:** Node-ZKLib, ESC/POS printer protocols
- **AI Integration:** Google Gemini API (`@google/genai`)

---

## 🚀 Getting Started (Running on Localhost)

### Option 1: One-Click Launch (Recommended for Windows)
Double-click `start-localhost.bat` in the project root. This will automatically start the server and open [http://localhost:3000](http://localhost:3000) in your default browser.

---

### Option 2: Running via Terminal / Command Prompt

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bdhostt/TSC-Cafeteria.git
   cd TSC-Cafeteria
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   *Or launch directly via Node:*
   ```bash
   node --import tsx server.ts
   ```

4. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option 3: Production Build & Execution

To bundle the frontend with Vite and build the backend with esbuild:

```bash
npm run build
npm start
```

The production server will serve the optimized frontend build and API on port `3000`.

---

## ⚙️ Environment Variables (`.env`)

Create or update the `.env` file in the root directory:

```env
# MongoDB Atlas Cloud Database URI
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/tsc_cafeteria?retryWrites=true&w=majority"

# Google Gemini API Key for AI features (Get free key from https://aistudio.google.com/)
GEMINI_API_KEY="your-gemini-api-key"

# Server Port
PORT=3000
```

> **Note:** If MongoDB is unreachable or internet access is lost, the system automatically falls back to local storage (`restaurant_data.json`) to keep offline operations running uninterrupted.

---

## 🌐 cPanel / Cloud Hosting Deployment

For cPanel hosting using the CloudLinux **Setup Node.js App** (Passenger):

1. **Node.js Selector Setup:**
   - **Node.js version:** `20.x` or `22.x`
   - **Application mode:** `Production`
   - **Application root:** `tsc` (or your chosen directory)
   - **Application URL:** `tsc.yourdomain.com`
   - **Application startup file:** `app.js`
2. **Build & Upload:**
   - Run `npm run build` locally.
   - Upload `dist/`, `app.js`, `package.json`, `.env`, and `restaurant_data.json` to your server folder.
3. **Install & Run:**
   - Click **Run NPM Install** in cPanel.
   - Click **Restart** to activate the application.

---

## 🖨️ Thermal Printer & Biometric Integration

- **Local Printer Agent:** To enable raw USB printing directly from cloud-hosted or browser instances, start `start-printer-agent.bat` on the local cashier PC.
- **Biometric Sync:** Configure your ZKTeco machine's local IP (e.g. `192.168.1.201`) and port (`4370`) in the HR settings panel to pull daily attendance logs.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server in live-reload development mode with `tsx watch` |
| `npm run build` | Builds Vite client and bundles `server.ts` into `dist/server.cjs` |
| `npm start` | Runs the compiled production server (`dist/server.cjs`) |
| `npm run preview` | Previews the Vite production build locally |
| `npm run lint` | Performs TypeScript type checks |

---

## 📄 License

Proprietary / All rights reserved by **BD HOSTT**.

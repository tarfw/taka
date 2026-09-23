# TAKA Scientific Document Signer & Stamp Web App

A fast, lightweight web application for stamping and signing PDF documents (Invoices, Quotations, Purchase Orders, Certificates) with official TAKA Scientific Equipment stamps and signatures.

---

## 🚀 Features

- **Official TAKA Assets Built-in**:
  - **Company Stamp**: TAKA Scientific Equipment L.L.C - S.P.C (Abu Dhabi - U.A.E)
  - **Authorized Signature**: M. Esha (Clean blue ink extraction)
  - **Stamp + Signature Combo**: Pre-aligned ready-to-use combination
- **Interactive Drag & Resize Canvas**:
  - Drag stamp and signature anywhere on the PDF page.
  - Scale / resize seamlessly with handles or sliders (30% to 200%).
  - Rotate (-45° to +45°) and adjust opacity.
- **Smart Quick Placement**:
  - ↘ **Bottom Right**: Instantly places on the invoice authorized signature line.
  - ↙ **Bottom Left**: Places on left footer.
  - ✛ **Center**: Places in the middle of page.
  - 📑 **Apply to All Pages**: Replicates the stamp across multi-page documents.
- **High-Fidelity PDF Export**:
  - Direct client-side binary injection using `pdf-lib`.
  - Preserves 100% vector text quality and original page resolution.
  - 100% offline-ready (all vendor libraries included locally).

---

## 💻 How to Run

### Method 1: Using the Launcher (Windows)
Double-click `start.bat` inside the `sign` folder. It will start a local server and automatically open the web app in your default browser (`http://localhost:8088/index.html`).

### Method 2: Command Line (Python)
```bash
cd sign
python server.py
```

### Method 3: Direct Browser File
You can also directly double-click `index.html` to open it in Chrome, Edge, or Firefox!

---

## 📁 Folder Structure

```
sign/
├── index.html                  # Main Web App UI
├── app.js                      # Application Engine (PDF.js + PDF-Lib integration)
├── styles.css                  # Modern UI Styles
├── server.py                   # Local HTTP server with auto-launch
├── start.bat                   # 1-click Windows launcher
├── sample.pdf                  # Sample invoice for quick 1-click testing
├── assets/
│   ├── stamp.png               # Clean transparent TAKA blue stamp
│   ├── signature.png           # Clean transparent M. Esha signature
│   └── stamp_and_signature.png # Combined stamp + signature
└── vendor/
    ├── pdf.min.js              # Local PDF.js engine
    ├── pdf.worker.min.js       # Local PDF worker
    └── pdf-lib.min.js          # Client-side PDF binary modifier
```

# Quick Start Guide - RegInforce AI Frontend

## 🎯 Getting Started in 3 Steps

### Step 1: Verify Backend is Running
Ensure your backend API is running on `http://localhost:8000`

Test it:
```bash
curl http://localhost:8000/health
```

### Step 2: Start the Frontend
The development server should already be running. If not:
```bash
cd d:\projects\reginforce-ai\reginforce-ai-frontend
pnpm dev
```

### Step 3: Access the Application
Open your browser to: **http://localhost:5173**

---

## 🧪 Testing the Application

### 1. Upload a Document
1. Navigate to "Documents" in the sidebar
2. Switch to "Regulations" or "Internal Policies" tab
3. Click "Upload New" or drag & drop a PDF/TXT file
4. Watch the status change from "Processing" to "Ready"

### 2. View Document List
- All uploaded documents appear in the table
- Status updates automatically via polling
- Filter by type using tabs

### 3. Navigate the App
- **Dashboard**: Overview and KPIs
- **Documents**: Upload and manage files
- **Reports**: View analysis results (placeholder)
- **Settings**: Application settings (placeholder)

---

## 📁 What's Available Now

### ✅ Working Features
- [x] Document upload (regulations & policies)
- [x] Real-time status updates
- [x] Tab filtering
- [x] Sidebar navigation
- [x] Responsive layout

### 🚧 Coming Soon
- [ ] Gap analysis reports
- [ ] Remediation planning
- [ ] Policy comparison
- [ ] Trend charts
- [ ] Chat assistant

---

## 🐛 Troubleshooting

### Backend Not Responding
```bash
# Check if backend is running
curl http://localhost:8000/health

# Start backend if needed
cd ../reginforce-ai-backend
python main.py  # or your backend start command
```

### Frontend Not Loading
```bash
# Kill existing dev server
Get-Process node | Where-Object {$_.Path -like "*pnpm*"} | Stop-Process

# Restart
pnpm dev
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 🎨 UI Overview

### Sidebar Navigation
- **Dashboard**: Home page with KPIs
- **Documents**: File management
- **Reports**: Analysis results
- **Settings**: App configuration
- **Help**: Documentation

### Documents Page
- **Tabs**: Switch between Regulations and Policies
- **Upload Area**: Drag & drop zone
- **Document Table**: List with status
  - File name
  - Upload timestamp
  - Processing status

---

## 📝 Next Development Steps

See `BUILD_SUMMARY.md` for detailed implementation plan of remaining pages:
1. Analysis Report Page
2. Remediation Roadmap
3. Policy Diff Viewer
4. Trend Analysis
5. Chat Sidebar

---

## 💡 Tips

- **Hot Reload**: Code changes update instantly
- **Type Safety**: TypeScript catches errors before runtime
- **React Query**: Handles caching and refetching automatically
- **Tailwind**: All styling via utility classes

---

## 📞 Support

- Check `README.md` for full documentation
- See `.github/github-copilot-instructions.md` for coding guidelines
- Review `openapi.json` for API specifications

---

**You're all set! Start uploading documents and exploring the application.** 🚀

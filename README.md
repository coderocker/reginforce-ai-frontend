# RegInforce AI Frontend

🤖 **AI-Powered Regulatory Compliance Management Platform**

A modern React-based frontend for RegInforce AI, enabling organizations to streamline regulatory compliance through intelligent document analysis, gap identification, and automated remediation planning.

## 🌟 Features

### 📊 **Compliance Dashboard**
- Real-time KPI monitoring and compliance metrics
- Interactive charts and trend analysis
- Executive-level compliance overview

### 📄 **Document Management**
- Drag-and-drop file uploads for regulations and policies
- Intelligent document processing with status tracking
- Support for multiple document formats (PDF, Word, etc.)

### 🔍 **AI-Powered Analysis**
- Automated compliance gap detection
- Risk assessment and scoring
- Gap clustering and categorization
- New Analysis modal for starting compliance reviews

### 📋 **Remediation Planning**
- Interactive Kanban boards for task management
- Dependency tracking and workflow visualization
- Automated remediation roadmap generation

### 💬 **Intelligent Chat Assistant**
- Context-aware compliance guidance
- Natural language query processing
- Real-time assistance during analysis

### 📈 **Advanced Reporting**
- Comprehensive compliance reports
- Policy comparison and diff analysis
- Historical trend analysis

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **pnpm** (recommended) or npm
- **RegInforce AI Backend** running on `http://localhost:8000`

### Installation

```bash
# Clone the repository
git clone https://github.com/coderocker/reginforce-ai-frontend.git
cd reginforce-ai-frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:5173`

### Backend Setup

Ensure the RegInforce AI backend is running on `http://localhost:8000`. The frontend is configured with a Vite proxy to handle API calls automatically.

## 🛠️ Development

### Tech Stack

- **React 19** with TypeScript (strict mode)
- **Vite 7** (Rolldown) for fast development and building
- **Tailwind CSS 3** for utility-first styling
- **React Query v5** for server state management
- **React Router v7** for navigation
- **Axios** for API communication
- **Recharts** for data visualization
- **@dnd-kit** for drag-and-drop functionality
- **ReactFlow** for workflow diagrams

### Available Scripts

```bash
# Development
pnpm dev          # Start development server with HMR
pnpm build        # Build for production
pnpm preview      # Preview production build

# Code Quality
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript checks

# Docker
docker compose up # Start with Docker Compose
```

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   ├── layouts/        # Layout components (MainLayout)
│   └── NewAnalysisModal.tsx # Analysis workflow modal
├── pages/              # Main application pages
│   ├── Dashboard.tsx   # Main dashboard with KPIs
│   ├── Documents.tsx   # Document management with upload
│   └── Reports.tsx     # Analysis reports (planned)
├── api/                # API client and functions
│   ├── client.ts       # Axios configuration with proxy
│   └── index.ts        # API endpoints (16 functions)
├── types/              # TypeScript type definitions (25+ interfaces)
├── providers/          # React context providers
└── App.tsx            # Main application component
```

### API Integration

The frontend communicates with the RegInforce AI backend through a RESTful API:

- **Documents**: Upload, list, and manage regulatory documents
- **Analysis**: Trigger compliance analysis (`POST /api/analysis/run`)
- **Reports**: Generate and view compliance reports
- **Remediation**: Create and manage remediation plans
- **Chat**: Interactive AI assistant for compliance guidance

## 🐳 Docker Support

### Development with Docker Compose

```bash
# Start all services
docker compose up

# Build and start in detached mode
docker compose up --build -d

# Stop services
docker compose down
```

### Production Deployment

```bash
# Build production image
docker build -t reginforce-frontend .

# Run container
docker run -p 80:80 reginforce-frontend
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME="RegInforce AI"
```

### Proxy Configuration

The Vite development server is configured to proxy API calls to the backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

## ✅ Current Features

- [x] **Document Library**: Upload, manage, and track processing status
- [x] **File Upload**: Drag-and-drop with real-time status polling
- [x] **New Analysis Modal**: Start compliance analysis workflow
- [x] **Main Layout**: Sidebar navigation with active states
- [x] **React Query Integration**: Intelligent caching and polling
- [x] **TypeScript Types**: Complete API type definitions
- [x] **Proxy Configuration**: CORS-free API communication

## 🚧 Planned Features

- [ ] **Analysis Report Page**: Gap clustering and drill-down functionality
- [ ] **Remediation Roadmap**: Kanban boards and dependency tracking
- [ ] **Global Chat Sidebar**: Context-aware AI assistance
- [ ] **Policy Diff Viewer**: Document comparison tools
- [ ] **Report History**: Historical analysis tracking

## 📝 Development Guidelines

See `WORKFLOW_CONTEXT.md` for detailed workflow specifications and `.github/github-copilot-instructions.md` for development guidelines including:

- Component structure and patterns
- API integration best practices  
- Styling conventions with Tailwind
- TypeScript type definitions
- React Query usage patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **TypeScript**: Strict mode with comprehensive type safety
- **ESLint**: React and TypeScript best practices
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, create an issue in this repository or contact the development team.

## 🔗 Related Projects

- [RegInforce AI Backend](https://github.com/coderocker/reginforce-ai-backend) - API server and AI processing engine
- [RegInforce AI Documentation](https://docs.reginforce.ai) - Complete platform documentation

---

**Built with ❤️ by the RegInforce AI Team**

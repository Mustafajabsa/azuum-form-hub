# Azuum Form Hub

A modern form builder application built with React, TypeScript, and shadcn/ui. Create beautiful, responsive forms with ease.

## ✨ Features

### Frontend Features

- 📱 **Fully Responsive** - Mobile-first design that works on all screen sizes
- 🎨 **Theming Support** - Customizable themes with dark/light mode
- 🛠 **Rich Form Elements**:
  - Text inputs, textareas, number fields
  - Date/Time pickers
  - File uploads with preview
  - Dropdowns and multi-select
  - Checkboxes and radio buttons
  - Sliders and rating inputs
- 👁 **Live Preview** - Real-time form preview as you build
- 📊 **Form Analytics** - View submission statistics and responses
- 🏷 **Form Templates** - Start with pre-built form templates
- 🔍 **Advanced Validation** - Built-in form validation
- 📤 **Export Options** - Export forms as JSON or HTML
- 🔒 **Role-based Access** - Control form access and permissions

## 🚀 Tech Stack

### Frontend

- **Core**:

  - React 18 with TypeScript
  - Vite 4.x (Build Tool)
  - React Router v6 (Routing)
  - React Query v4 (Data Fetching)
  - Zod (Schema Validation)

- **UI Components & Styling**:

  - shadcn/ui + Radix UI (Headless Components)
  - Tailwind CSS 3.x (Utility-first CSS)
  - Class Variance Authority (Component Variants)
  - Lucide React (Icons)
  - Framer Motion (Animations)

- **Form Handling**:

  - React Hook Form (Form State Management)
  - @hookform/resolvers (Zod Integration)
  - React DnD (Drag and Drop)
  - React Dropzone (File Uploads)

- **State Management**:

  - Jotai (Global State)
  - Immer (Immutable Updates)
  - React Error Boundary (Error Handling)

- **Development Tools**:

  - ESLint + Prettier (Code Quality)
  - TypeScript 5.x (Type Checking)
  - Vitest (Testing)
  - Storybook (Component Library)
  - MSW (API Mocking)

- **Performance**:

  - React.lazy + Suspense (Code Splitting)
  - Vite's build optimizations
  - React.memo + useMemo/useCallback (Performance Optimization)

- **Backend (Planned)**:
  - Django REST Framework
  - PostgreSQL database
  - JWT Authentication
  - File storage (S3 compatible)

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm (v9+) / yarn (1.22+) / pnpm (v8+)
- Git

### Frontend Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/azuum-form-hub.git
   cd azuum-form-hub/frontend
   ```

2. **Install dependencies**:

   ```bash
   # Using npm
   npm install

   # Using yarn
   yarn

   # Using pnpm
   pnpm install
   ```

3. **Environment Setup**:

   - Copy `.env.example` to `.env`
   - Update environment variables as needed

4. **Start Development Server**:

   ```bash
   # Development server
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

   - App will be available at: [http://localhost:5173](http://localhost:5173)

5. **Build for Production**:

   ```bash
   # Build the app for production
   npm run build

   # Preview the production build locally
   npm run preview
   ```

### Available Scripts

- `dev` - Start development server
- `build` - Build for production
- `preview` - Preview production build locally
- `test` - Run tests
- `test:watch` - Run tests in watch mode
- `lint` - Run ESLint
- `format` - Format code with Prettier
- `storybook` - Launch Storybook
- `build-storybook` - Build Storybook

### Development Workflow

1. **Component Development**:

   - Create new components in `src/components`
   - Add stories in `src/stories` for component documentation
   - Test components using `*.test.tsx` files

2. **Styling**:

   - Use Tailwind CSS utility classes
   - For complex styles, use CSS Modules
   - Theme variables are defined in `src/styles/theme.css`

3. **State Management**:
   - Local state: React `useState`/`useReducer`
   - Global state: Jotai atoms
   - Server state: React Query

## 🏗 Project Structure

```
frontend/
├── public/                # Static assets
├── src/
│   ├── assets/            # Images, fonts, and other static files
│   ├── components/        # Reusable UI components
│   │   ├── form-builder/  # Form building components
│   │   │   ├── fields/    # Form field components
│   │   │   ├── panels/    # Sidebar panels
│   │   │   └── FormBuilder.tsx  # Main form builder component
│   │   └── ui/           # shadcn/ui components
│   │       └── button.tsx # Example UI component
│   │
│   ├── config/           # App configuration
│   │   ├── routes.ts     # Route configurations
│   │   └── theme.ts      # Theme configurations
│   │
│   ├── contexts/         # React contexts
│   │   └── theme-context.tsx
│   │
│   ├── hooks/            # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   └── use-theme.ts
│   │
│   ├── integrations/     # Third-party integrations
│   │   └── supabase/     # Supabase client and auth
│   │
│   ├── lib/              # Utility functions
│   │   ├── api/          # API client
│   │   ├── utils/        # Helper functions
│   │   └── validations/  # Form validations
│   │
│   ├── pages/            # Application pages
│   │   ├── Dashboard/    # Dashboard page
│   │   ├── FormBuilder/  # Form creation page
│   │   ├── FormPreview/  # Form preview page
│   │   ├── Storage/      # File storage management
│   │   └── Settings/     # User settings
│   │
│   ├── services/         # API services
│   │   ├── form.service.ts
│   │   └── storage.service.ts
│   │
│   ├── stores/           # State management
│   │   └── form-store.ts
│   │
│   ├── styles/           # Global styles
│   │   ├── globals.css
│   │   └── theme.css
│   │
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   │
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Application entry point
│   └── vite-env.d.ts     # Vite type declarations
│
├── .env.example         # Environment variables example
├── .eslintrc.js         # ESLint configuration
├── .prettierrc          # Prettier configuration
├── index.html           # HTML template
├── package.json         # Project dependencies
├── postcss.config.js    # PostCSS configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

```

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Lint code
- `npm run preview` - Preview production build

## 🔌 Backend Integration (Planned)

The application is currently set up with a mock backend. To connect to a real backend:

1. Set up a Django REST Framework backend
2. Configure environment variables (see `.env.example`)
3. Implement authentication endpoints
4. Set up form storage and submission handling

## 🌐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```

VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

````

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Radix UI](https://www.radix-ui.com/) for accessible primitives
- [Vite](https://vitejs.dev/) for the excellent build tooling
- [React DnD](https://react-dnd.github.io/react-dnd/about) for drag and drop functionality => currently not used, but incase we need it in the future.

## 📬 Contact

For support or questions, please open an issue in the repository.

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in github.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
````

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

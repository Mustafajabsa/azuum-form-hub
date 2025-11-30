# Azuum Form Hub

A modern form builder application built with React, TypeScript, and shadcn/ui. Create beautiful, responsive forms with ease.

## ✨ Features

- 🎨 **Form Builder** - Intuitive interface for building forms
- 📱 **Responsive Design** - Works seamlessly on all devices
- 🛠 **Multiple Field Types** - Text, number, date, file uploads, and more
- 👁 **Real-time Preview** - See your form as you build it
- 📊 **Form Management** - Save, edit, and organize your forms
- 🔒 **Secure** - Built with security best practices in mind

## 🚀 Tech Stack

- **Frontend**:

  - React 18 with TypeScript
  - Vite for build tooling
  - shadcn/ui + Radix UI components
  - Tailwind CSS for styling
  - React DnD for drag and drop
  - React Query for data fetching
  - React Router for navigation

- **Backend (Planned)**:
  - Django REST Framework
  - PostgreSQL database
  - JWT Authentication
  - File storage (S3 compatible)

## 🛠️ Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn/pnpm
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/azuum-form-hub.git
   cd azuum-form-hub
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🏗 Project Structure

```
azuum-form-hub/
├── public/            # Static files
├── src/
│   ├── components/    # Reusable UI components
│   │   ├── form-builder/  # Form building components
│   │   └── ui/       # shadcn/ui components
│   ├── hooks/         # Custom React hooks
│   │   ├── use-auth.ts    # Authentication logic
│   │   ├── use-mobile.tsx # Responsive helpers
│   │   └── use-toast.ts   # Notification system
│   ├── integrations/  # Third-party integrations
│   │   └── supabase/  # Supabase configuration
│   ├── pages/         # Application pages
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── FormBuilder.tsx  # Form creation
│   │   ├── FormPreview.tsx  # Form preview
│   │   ├── FilledForms.tsx  # Form submissions
│   │   ├── Storage.tsx      # File storage
│   │   └── Settings.tsx     # User settings
│   ├── App.tsx        # Main application component
│   └── main.tsx       # Application entry point
├── .env.example       # Example environment variables
├── package.json
└── vite.config.ts
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
```

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
- [React DnD](https://react-dnd.github.io/react-dnd/about) for drag and drop functionality

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
```

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

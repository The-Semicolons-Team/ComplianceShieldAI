# ComplianceShield Frontend

Next.js 14 frontend application for the AI Compliance Monitoring System.

## Features

- 🎨 Modern, responsive UI with Tailwind CSS
- 🔐 AWS Cognito authentication
- 📊 Interactive dashboard with charts and analytics
- 📱 Mobile-friendly design
- 🔔 Real-time notifications
- 📈 Risk-based compliance tracking
- 🎯 Multi-channel notification preferences

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: AWS Amplify + Cognito
- **State Management**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- AWS Cognito User Pool configured

### Installation

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_URL=https://your-api-gateway-url
   NEXT_PUBLIC_AWS_REGION=ap-south-1
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_xxxxxxxxx
   NEXT_PUBLIC_COGNITO_CLIENT_ID=your-cognito-client-id
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Login page
│   │   └── dashboard/         # Dashboard pages
│   ├── components/            # React components
│   │   ├── landing/           # Landing page components
│   │   └── dashboard/         # Dashboard components
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx   # Authentication context
│   └── store/                 # Zustand stores
│       └── complianceStore.ts # Compliance data store
├── public/                    # Static assets
├── .env.example              # Environment variables template
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Pages

### Landing Page (`/`)
- Hero section with key features
- Feature highlights
- How it works section
- Call-to-action
- Footer with links

### Login Page (`/login`)
- Email/password authentication
- OAuth integration (Google, Outlook)
- Remember me functionality
- Forgot password link
- Sign up link

### Dashboard (`/dashboard`)
- Overview with key metrics
- Risk distribution charts
- Category distribution
- Recent compliance notices
- Upcoming deadlines
- Quick actions

### Compliance Notices (`/dashboard/notices`)
- List of all compliance notices
- Filtering by risk level, category, status
- Search functionality
- Detailed notice view
- Acknowledge notices

### Notifications (`/dashboard/notifications`)
- Notification history
- Notification preferences
- Channel configuration (Email, SMS, WhatsApp)
- Quiet hours settings

### Settings (`/dashboard/settings`)
- Profile management
- Email integration setup
- Notification preferences
- Security settings
- Data export/deletion

## Authentication Flow

1. User enters credentials on login page
2. AWS Amplify authenticates with Cognito
3. JWT tokens stored securely
4. Protected routes check authentication status
5. Automatic token refresh
6. Logout clears session

## State Management

The application uses Zustand for state management:

- **AuthContext**: User authentication state
- **complianceStore**: Compliance notices and operations

## Styling

Tailwind CSS is used for styling with custom configurations:

- Custom color palette (primary, risk levels)
- Responsive breakpoints
- Custom components (buttons, cards, badges)
- Animation utilities

## API Integration

The frontend communicates with the backend API:

- Base URL configured via environment variable
- JWT authentication headers
- Error handling and retry logic
- Mock data for development

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

```bash
vercel deploy
```

### Deploy to AWS Amplify

1. Connect your Git repository
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
3. Add environment variables
4. Deploy

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |
| `NEXT_PUBLIC_AWS_REGION` | AWS region | Yes |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool ID | Yes |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito Client ID | Yes |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and type checking
4. Submit a pull request

## License

MIT License - See LICENSE file for details

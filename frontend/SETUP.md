# ComplianceShield Frontend Setup Guide

## Quick Start

### Prerequisites

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Install LTS version (20.x or higher)
   - Verify installation:
     ```powershell
     node --version
     npm --version
     ```

### Installation Steps

1. **Navigate to frontend directory**
   ```powershell
   cd frontend
   ```

2. **Run the startup script**
   ```powershell
   .\start.ps1
   ```

   The script will:
   - Check Node.js installation
   - Install dependencies automatically
   - Create .env.local with mock authentication
   - Start the development server

3. **Access the application**
   - Open your browser to: http://localhost:3000
   - Login with any email/password (mock auth is enabled)

## Manual Setup

If you prefer manual setup:

```powershell
# Install dependencies
npm install

# Copy environment file
copy .env.example .env.local

# Start development server
npm run dev
```

## Authentication Modes

### Mock Authentication (Default)

The application uses mock authentication by default for easy development without AWS setup.

**Features:**
- No AWS Cognito required
- Login with any email/password
- Perfect for local development
- Data persists in browser localStorage

**Configuration:**
```env
NEXT_PUBLIC_USE_MOCK_AUTH=true
```

### AWS Cognito Authentication

To use real AWS Cognito authentication:

1. **Create AWS Cognito User Pool**
   - Go to AWS Console → Cognito
   - Create a User Pool in ap-south-1 (Mumbai)
   - Note the User Pool ID and Client ID

2. **Update .env.local**
   ```env
   NEXT_PUBLIC_USE_MOCK_AUTH=false
   NEXT_PUBLIC_AWS_REGION=ap-south-1
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_xxxxxxxxx
   NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id
   ```

3. **Restart the server**
   ```powershell
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Troubleshooting

### Node.js Not Found

**Error:** `node: The term 'node' is not recognized`

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart your terminal/PowerShell
3. Verify: `node --version`

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```powershell
# Kill the process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
$env:PORT=3001; npm run dev
```

### Dependencies Installation Failed

**Error:** `npm install` fails

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Reinstall
npm install
```

### Module Not Found Errors

**Error:** `Cannot find module 'next'`

**Solution:**
```powershell
# Reinstall dependencies
npm install
```

## Development Tips

### Hot Reload

The development server supports hot reload. Changes to files will automatically refresh the browser.

### Mock Data

The application includes mock compliance data for development:
- 3 sample compliance notices
- Different risk levels (Critical, High, Medium)
- Various categories (Tax, Labor, Corporate)

### Browser DevTools

Use React DevTools for debugging:
- Install: https://react.dev/learn/react-developer-tools
- Inspect component state and props
- Debug authentication flow

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── contexts/         # React contexts (Auth)
│   └── store/           # Zustand stores
├── public/              # Static assets
├── .env.local          # Environment variables
├── package.json        # Dependencies
└── start.ps1          # Startup script
```

## Next Steps

1. **Explore the Application**
   - Landing page: http://localhost:3000
   - Login: http://localhost:3000/login
   - Dashboard: http://localhost:3000/dashboard

2. **Customize**
   - Modify components in `src/components/`
   - Update styles in `src/app/globals.css`
   - Add new pages in `src/app/`

3. **Connect to Backend**
   - Update `NEXT_PUBLIC_API_URL` in `.env.local`
   - Implement real API calls in `src/store/complianceStore.ts`

## Support

For issues or questions:
- Check the main README.md
- Review the design.md and requirements.md
- Check the tasks.md for implementation details

## License

MIT License - See LICENSE file for details

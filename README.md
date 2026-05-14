# Backend Setup Guide

This guide shows you how to set up your backend with TypeScript, path aliases, and WebSocket support using Yarn.

## 🚀 Quick Start

1. **Install dependencies with Yarn:**
   ```bash
   cd backend
   yarn install
   ```

2. **Create .env file:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database URI and other configurations.

3. **Run the development server:**
   ```bash
   yarn dev
   ```

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # Express server with WebSocket
│   ├── routes/
│   │   ├── auth.ts          # Authentication routes
│   │   ├── captcha.ts       # Captcha handling routes
│   │   ├── users.ts         # User management routes
│   │   ├── admin.ts         # Admin panel routes
│   │   └── analytics.ts     # Analytics routes
│   ├── models/
│   │   ├── User.ts          # User model
│   │   └── Captcha.ts       # Captcha model
│   ├── services/
│   │   └── CaptchaService.ts # Captcha business logic
│   ├── middleware/
│   │   ├── auth.ts          # Authentication middleware
│   │   ├── errorHandler.ts  # Error handling middleware
│   │   └── logger.ts        # Request logging middleware
│   └── utils/
├── dist/                    # Compiled TypeScript output
└── package.json            # Dependencies and scripts
```

## 🔄 WebSocket Features

### Real-time Updates
- Captcha status updates (pending → processing → completed/failed)
- User credit updates
- System notifications

### Socket.IO Events

**Client to Server:**
- `join-captcha-room`: Join a room for user-specific updates
- `captcha-submit`: Submit a captcha for processing
- `captcha-status`: Update captcha status

**Server to Client:**
- `captcha-task-created`: New captcha task created
- `captcha-status-update`: Status changed
- `captcha-completed`: Captcha solved successfully
- `captcha-failed`: Processing failed

### Example Usage

```typescript
// Connect to WebSocket
const socket = io('http://localhost:3001');

// Join user room
socket.emit('join-captcha-room', userId);

// Listen for updates
socket.on('captcha-status-update', (task) => {
  console.log('Captcha updated:', task.status);
});

socket.on('captcha-completed', (task) => {
  console.log('Captcha completed:', task.result);
});
```

## 📋 Available Scripts

```bash
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Captcha
- `POST /api/captcha/create` - Create new captcha task
- `POST /api/captcha/submit` - Submit captcha for processing
- `GET /api/captcha/my-tasks` - Get user's captcha tasks
- `GET /api/captcha/:taskId` - Get specific captcha task

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/credits` - Purchase credits

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:userId/credits` - Update user credits

## 🔧 Configuration

### Environment Variables
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/captchamaster
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

### Path Aliases
Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/models/*": ["src/models/*"],
      "@/routes/*": ["src/routes/*"],
      "@/middleware/*": ["src/middleware/*"],
      "@/services/*": ["src/services/*"],
      "@/utils/*": ["src/utils/*"]
    }
  }
}
```

## 🎯 WebSocket Connection Tips

1. **Always handle connection changes:**
   ```typescript
   socket.on('connect', () => console.log('Connected'));
   socket.on('disconnect', () => console.log('Disconnected'));
   ```

2. **Use rooms for efficient broadcasting:**
   ```typescript
   socket.join(`user-${userId}`);  // Join user-specific room
   io.to(`user-${userId}`).emit('event');  // Send to specific user
   ```

3. **Clean up listeners:**
   ```typescript
   // In cleanup
   socket.off('event-name', handler);
   ```

## 📦 Production Deployment

1. **Build the application:**
   ```bash
   yarn build
   ```

2. **Start production server:**
   ```bash
   yarn start
   ```

3. **Use PM2 for process management:**
   ```bash
   pm2 start dist/server.js -n "captcha-backend"
   ```

## 🔍 Debugging

### Enable verbose logging:
```env
LOG_LEVEL=debug
```

### Check WebSocket connections:
```bash
# Server info endpoint
curl http://localhost:5000/socket-info
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket not connecting:**
   - Check CORS configuration
   - Verify WebSocket server is running
   - Check firewall settings

2. **TypeScript errors:**
   - Run `yarn build` to check for compilation errors
   - Ensure all imports use path aliases

3. **Database connection issues:**
   - Verify MongoDB is running
   - Check connection string in .env

## 📚 Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Documentation](https://mongoosejs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)"# fontdend_app_b" 

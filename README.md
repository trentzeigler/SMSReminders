# SMS Reminders

An AI-powered reminder assistant that allows users to create, manage, and receive reminders via SMS and a web interface. Built with Node.js, TypeScript, MongoDB, LangChain, OpenAI, and Twilio.

## Features

- 🤖 **AI-Powered Assistant**: Natural language processing using OpenAI and LangChain
- 📱 **SMS Integration**: Send and receive reminders via Twilio SMS
- 💬 **Web Chat Interface**: ChatGPT-like interface for managing reminders
- 🔐 **Full Authentication**: JWT-based authentication with login/signup
- 📅 **Smart Scheduling**: Automatic reminder delivery at scheduled times
- 💾 **Conversation History**: Stateful conversations with context retention
- 🎨 **Modern UI**: High-contrast dark theme with smooth animations

## Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Database**: MongoDB
- **AI/LLM**: LangChain, OpenAI API
- **SMS**: Twilio
- **Authentication**: JWT, bcrypt
- **Scheduling**: node-cron
- **Testing**: Jest
- **Linting**: ESLint, Prettier

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or Atlas)
- OpenAI API key
- Twilio account (Account SID, Auth Token, Phone Number)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SMSReminders
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your credentials:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000
   HOST=localhost

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/sms-reminders

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+1234567890

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here_at_least_32_characters
   JWT_EXPIRES_IN=7d

   # Logging Configuration
   LOG_LEVEL=info
   LOG_FILE_PATH=./logs/app.log

   # Reminder Scheduler Configuration
   REMINDER_CHECK_INTERVAL=* * * * *
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

## Usage

### Development

```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot-reloading enabled.

### Production

```bash
# Build the TypeScript code
npm run build

# Start the production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

## Application Structure

```
SMSReminders/
├── src/
│   ├── agent/
│   │   ├── tools/
│   │   │   └── ReminderTools.ts      # LangChain tools for CRUD operations
│   │   └── AgentService.ts           # LangChain agent management
│   ├── config/
│   │   └── Config.ts                 # Configuration management
│   ├── controllers/
│   │   ├── AuthController.ts         # Authentication endpoints
│   │   ├── ChatController.ts         # Chat interface endpoints
│   │   └── WebhookController.ts      # Twilio webhook handler
│   ├── database/
│   │   └── MongoDBConnection.ts      # MongoDB connection singleton
│   ├── middleware/
│   │   └── AuthMiddleware.ts         # JWT authentication middleware
│   ├── models/
│   │   ├── User.ts                   # User model
│   │   ├── Reminder.ts               # Reminder model
│   │   └── Conversation.ts           # Conversation model
│   ├── repositories/
│   │   ├── IRepository.ts            # Repository interface
│   │   ├── UserRepository.ts         # User data access
│   │   ├── ReminderRepository.ts     # Reminder data access
│   │   └── ConversationRepository.ts # Conversation data access
│   ├── services/
│   │   ├── TwilioService.ts          # Twilio SMS service
│   │   └── ReminderScheduler.ts      # Background job scheduler
│   ├── utils/
│   │   ├── Logger.ts                 # Winston logger
│   │   ├── DateValidator.ts          # Date validation utility
│   │   └── PasswordHelper.ts         # Password hashing utility
│   ├── views/
│   │   ├── login.ejs                 # Login page
│   │   ├── signup.ejs                # Signup page
│   │   └── chat.ejs                  # Chat interface
│   ├── __tests__/                    # Test files
│   └── server.ts                     # Express server entry point
├── public/
│   ├── styles.css                    # Application styles
│   ├── chat.js                        # Chat application JavaScript
│   └── auth.js                       # Authentication JavaScript
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc
└── .env.example
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login and receive JWT token
- `POST /api/auth/logout` - Logout (client-side token removal)
- `GET /api/auth/me` - Get current user info (protected)

### Chat

- `GET /` - Render chat interface (protected)
- `POST /api/chat` - Send message to AI assistant (protected)
- `GET /api/conversations` - List user's conversations (protected)
- `POST /api/conversations` - Create new conversation (protected)
- `GET /api/conversations/:id` - Get conversation with messages (protected)
- `GET /api/reminders` - Get user's reminders (protected)

### Webhooks

- `POST /api/webhook/sms` - Twilio SMS webhook

### Health

- `GET /health` - Health check endpoint

## Twilio Webhook Setup

1. **Expose your local server** (for development)
   ```bash
   # Using ngrok
   ngrok http 3000
   ```

2. **Configure Twilio webhook**
   - Go to your Twilio Console
   - Navigate to Phone Numbers → Manage → Active Numbers
   - Select your phone number
   - Under "Messaging", set the webhook URL:
     - **A MESSAGE COMES IN**: `https://your-domain.com/api/webhook/sms` (HTTP POST)

3. **Test SMS**
   - Send a text message to your Twilio phone number
   - Example: "Remind me to call mom tomorrow at 3pm"
   - The assistant will process your message and respond

## How It Works

### SMS Flow

1. User sends SMS to Twilio number
2. Twilio forwards message to `/api/webhook/sms`
3. System finds or creates user by phone number
4. Message is processed by LangChain agent with OpenAI
5. Agent uses tools to perform CRUD operations on reminders
6. Response is sent back via SMS

### Web Flow

1. User signs up/logs in and receives JWT token
2. User accesses chat interface
3. Messages are sent to `/api/chat` with JWT authentication
4. Agent processes message with conversation context
5. Response is displayed in real-time with typing indicators

### Reminder Delivery

1. Background scheduler checks for due reminders every minute
2. Pending reminders with `scheduledFor <= now` are found
3. SMS is sent to user's phone number
4. Reminder status is updated to "sent"

## Architecture Highlights

### OOP Design Patterns

- **Singleton Pattern**: MongoDB connection, Logger, Config
- **Repository Pattern**: Data access layer abstraction
- **Dependency Injection**: Controllers receive dependencies via constructor
- **Factory Pattern**: Model creation from documents

### Type Safety

- Full TypeScript with strict mode enabled
- Zod schemas for runtime validation
- Generic repository interface for type-safe CRUD operations
- Strongly typed models and DTOs

### Security

- JWT token-based authentication
- bcrypt password hashing (12 rounds)
- Password strength validation
- Twilio webhook signature verification
- Input validation with Zod

## Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Use MongoDB Atlas for production database
3. Set strong `JWT_SECRET` (at least 32 characters)
4. Configure Twilio webhook to production URL
5. Set appropriate `LOG_LEVEL` (warn or error)

### Deployment Platforms

The application can be deployed to:

- **Heroku**: Add MongoDB Atlas add-on
- **Railway**: Auto-deploy from GitHub
- **Render**: Web service with MongoDB Atlas
- **DigitalOcean App Platform**: With managed MongoDB
- **AWS/GCP/Azure**: With managed MongoDB service

### Example: Deploy to Railway

1. Push code to GitHub
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard
4. Deploy automatically on push

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env`
- For Atlas, whitelist your IP address

### Twilio Webhook Not Working

- Verify webhook URL is publicly accessible
- Check Twilio webhook logs in console
- Ensure webhook signature validation is disabled in development

### OpenAI API Errors

- Verify `OPENAI_API_KEY` is correct
- Check API quota and billing
- Ensure model name is valid (e.g., `gpt-4o-mini`)

### JWT Token Issues

- Ensure `JWT_SECRET` is at least 32 characters
- Check token expiration (`JWT_EXPIRES_IN`)
- Clear browser localStorage and re-login

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

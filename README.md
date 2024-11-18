# AI Research Assistant

An AI-powered research assistant that generates customizable articles with academic styling and social media sharing capabilities. This platform helps users create well-researched content with proper citations and academic formatting.

## Features

- 🤖 AI-driven article generation with OpenAI integration
- 🔐 Secure authentication using Replit Auth
- 🎙️ Speech-to-text input for research topics
- 📊 React frontend with SWR for efficient data fetching
- 🗄️ S3-based content storage system
- 🔄 Social media sharing (Facebook, Twitter, LinkedIn)
- 🛡️ Protected routes and authentication checks
- 📄 Paginated content display with 'Load More' functionality
- 🔄 Content archiving and restoration
- 📝 Standardized HTML formatting
- ⚡ Rate limiting tiers for authenticated/unauthenticated users

## Tech Stack

- **Frontend**:
  - React with TypeScript
  - SWR for data fetching
  - Tailwind CSS for styling
  - Web Speech API for speech-to-text
  - Shadcn UI components

- **Backend**:
  - Express.js
  - OpenAI API integration
  - AWS S3 for storage
  - Rate limiting middleware
  - Session-based authentication

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- OpenAI API key
- AWS S3 credentials
- Replit account for authentication

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-research-assistant.git
cd ai-research-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```env
OPENAI_API_KEY=your_openai_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BUCKET_NAME=your_bucket_name
AWS_REGION=your_aws_region
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utility functions
│   │   ├── pages/      # Page components
│   │   └── styles/     # CSS styles
├── server/              # Backend Express application
│   ├── middleware/     # Custom middleware
│   ├── auth.ts        # Authentication logic
│   └── routes.ts      # API routes
└── db/                 # Database configuration
```

## Usage

1. **Authentication**: Sign in using your Replit account credentials.

2. **Creating Articles**:
   - Enter your research topic in the input field
   - Optionally use speech-to-text for input
   - Configure article length and style preferences
   - Generate AI-powered content

3. **Managing Content**:
   - View generated articles in a paginated list
   - Archive or restore articles as needed
   - Share content on social media platforms
   - Export articles in academic format

## Rate Limiting

The API implements tiered rate limiting:
- Authenticated users: 100 requests per hour
- Unauthenticated users: 20 requests per hour

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the AI capabilities
- Replit for authentication and hosting
- Shadcn UI for the component library

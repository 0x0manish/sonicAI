# Sonic AI Agent

Sonic AI is an intelligent assistant specialized in Solana blockchain and Sonic SVM (Solana Virtual Machine) technology. This project provides both a web interface and a Telegram bot for interacting with the Sonic AI agent.

## About Sonic

Sonic is the first atomic SVM (Solana Virtual Machine) chain engineered to accelerate and enhance the Solana Virtual Machine. It addresses challenges in blockchain performance by enabling high-throughput applications while maintaining decentralization. As an atomic SVM chain, Sonic allows applications to operate with their own computational resources while staying connected to Solana's security.

### Key Technologies

1. **HyperGrid Framework**: A scalable architecture that enables parallel processing of transactions, allowing thousands of concurrent operations without competing for the same blockchain resources.
2. **Sorada**: A fundamental shift in SVM data architecture that decouples read operations from transaction processing, delivering 30-40x improvement in read performance (as low as 5ms).
3. **Rush**: An Entity-Component-System (ECS) framework for blockchain development that takes a declarative approach, generating smart contracts and SDKs from simple configuration files.

## Features

- Modern ChatGPT-like web interface
- Speech-to-text input capability
- Telegram bot integration
- Powered by OpenAI's GPT-4o-mini model
- Responsive design for all devices

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key
- Telegram Bot Token (for bot functionality)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/sonic-agent.git
   cd sonic-agent
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   AI_PROVIDER=openai
   AI_MODEL=gpt-4o-mini
   ```

### Running the Web Interface

```
npm run dev
```

The web interface will be available at http://localhost:3000.

### Running the Telegram Bot

```
npm run bot
```

## Architecture

The project is built with:
- Next.js for the web interface
- Telegraf for the Telegram bot
- OpenAI API for AI capabilities
- TailwindCSS for styling

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Solana Foundation
- OpenAI
- Vercel

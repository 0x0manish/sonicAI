# Sonic AI Agent

<div align="center">
  <img src="./public/logo.jpeg" alt="Sonic AI Logo" width="240" height="240" style="border-radius: 50%;">
</div>

Sonic AI is an intelligent assistant specialized in Solana blockchain and Sonic SVM (Solana Virtual Machine) technology. This project provides both a web interface and a Telegram bot for interacting with the Sonic AI agent.

## About Sonic

Sonic is the first atomic SVM (Solana Virtual Machine) chain engineered to accelerate and enhance the Solana Virtual Machine. It addresses challenges in blockchain performance by enabling high-throughput applications while maintaining decentralization. As an atomic SVM chain, Sonic allows applications to operate with their own computational resources while staying connected to Solana's security.

### Key Technologies

1. **HyperGrid Framework**: A scalable architecture that enables parallel processing of transactions, allowing thousands of concurrent operations without competing for the same blockchain resources.
2. **Sorada**: A fundamental shift in SVM data architecture that decouples read operations from transaction processing, delivering 30-40x improvement in read performance (as low as 5ms).
3. **Rush**: An Entity-Component-System (ECS) framework for blockchain development that takes a declarative approach, generating smart contracts and SDKs from simple configuration files.

## Features

- **Modern ChatGPT-like web interface** with responsive design for all devices
- **Telegram bot integration** for mobile access
- **Wallet Integration**:
  - Check wallet balances by address
  - View token holdings and SOL balance
  - Request testnet tokens from faucet
- **Token Information**:
  - Get token prices by mint address
  - View detailed token information (symbol, name, decimals, mint address, program ID)
- **Liquidity Pool Data**:
  - View liquidity pool information by pool ID
  - Get list of top liquidity pools with TVL, volume, and APR
- **Sonic Chain Statistics**:
  - View TVL, volume, and other key metrics
  - Track ecosystem growth
- **AI-Powered Assistance**:
  - Answer questions about Sonic technology
  - Provide guidance on ecosystem projects
  - Help with blockchain interactions

## Technical Architecture

### Core Components

- **Web Interface**: Next.js application with TailwindCSS
- **Telegram Bot**: Built with Telegraf framework
- **AI Backend**: Powered by OpenAI's GPT-4o-mini model
- **API Layer**: RESTful endpoints for blockchain data

### Utility Libraries

The project includes several specialized utility libraries:

- **token-utils.ts**: Handles token price fetching, token details, and formatting
- **wallet-utils.ts**: Manages wallet balance queries and validation
- **liquidity-pool-utils.ts**: Processes liquidity pool data and formatting
- **stats-utils.ts**: Formats chain statistics for display
- **ai-utils.ts**: Manages AI model interactions and message formatting
- **env-utils.ts**: Handles environment variable management
- **agent-wallet.ts**: Manages the agent's own wallet functionality
- **faucet-utils.ts**: Handles testnet token distribution

### API Endpoints

The application provides several API endpoints:

- **/api/chat**: Processes AI chat interactions
- **/api/wallet**: Retrieves wallet balance information
- **/api/token-price**: Fetches current token prices
- **/api/token-details**: Retrieves detailed token information
- **/api/liquidity-pool**: Gets information about specific liquidity pools
- **/api/liquidity-pools**: Lists top liquidity pools
- **/api/stats**: Retrieves Sonic chain statistics
- **/api/faucet**: Handles testnet token distribution
- **/api/agent-wallet**: Provides information about the agent's wallet

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
   SONIC_RPC_URL=https://rpc.mainnet-alpha.sonic.game
   SONIC_TESTNET_RPC_URL=https://api.testnet.sonic.game
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

### Environment Validation

The application includes built-in environment validation to ensure all required variables are set:

```
npm run check-env
```

## Development

### Project Structure

```
sonic-agent/
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js app router
│   │   ├── api/         # API endpoints
│   │   └── page.tsx     # Main page
│   ├── bot/             # Telegram bot implementation
│   ├── components/      # React components
│   ├── lib/             # Utility libraries
│   └── scripts/         # Helper scripts
├── .env.local           # Environment variables (create this)
└── next.config.js       # Next.js configuration
```

### Adding New Features

When adding new features:

1. Create appropriate utility functions in the `src/lib` directory
2. Add API endpoints in `src/app/api` if needed
3. Update the web interface in `src/components`
4. Add corresponding functionality to the Telegram bot in `src/bot`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Solana Foundation
- OpenAI
- Vercel
- Sega DEX for API integration

import React from 'react';
import Chat from '@/components/Chat';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center overflow-hidden py-4 md:py-8">
        <div className="w-full max-w-2xl mx-auto flex flex-col flex-1 bg-white dark:bg-gray-800 shadow-sm md:shadow-md rounded-lg overflow-hidden">
          {/* Chat header */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-4 py-4 flex items-center">
              <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shadow-sm mr-3">
                <Image 
                  src="/logo.jpeg" 
                  alt="Sonic AI" 
                  width={28} 
                  height={28} 
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Sonic AI</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Accelerating Solana Virtual Machine</p>
              </div>
              <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                Powered by Sonic
              </div>
            </div>
          </div>
          
          {/* Chat area */}
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-2 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        <p>© {new Date().getFullYear()} Sonic AI</p>
      </footer>
    </div>
  );
}

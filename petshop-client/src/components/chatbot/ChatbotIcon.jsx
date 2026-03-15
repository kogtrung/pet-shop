import React from 'react';

const ChatbotIcon = ({ onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-50 w-16 h-16 rounded-full bg-yellow-400 shadow-lg hover:bg-yellow-500 transition-all duration-300 flex items-center justify-center border-2 border-white"
      aria-label="AI Chatbot"
    >
      {/* Chat bubble icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-white"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
          clipRule="evenodd"
        />
      </svg>
      {/* AI label */}
      <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
        AI
      </span>
    </button>
  );
};

export default ChatbotIcon;
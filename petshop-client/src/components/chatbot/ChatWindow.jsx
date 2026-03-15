import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { sendChatMessage, submitChatFeedback } from '../../api/chatApi'; // Import the new function

const ChatWindow = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Xin chào! Tôi là trợ lý AI của PetShop. Bạn có thể hỏi tôi về sản phẩm, cách chăm sóc thú cưng, hoặc bất kỳ câu hỏi nào liên quan.",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load session ID from localStorage on component mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('chatSessionId');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: Date.now(), // Use timestamp for unique ID
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userQuery = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the AI chat API with session ID
      const requestData = {
        query: userQuery,
        sessionId: sessionId // Include session ID if available
      };
      
      const response = await sendChatMessage(requestData);

      // Save session ID from response
      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
        localStorage.setItem('chatSessionId', response.data.sessionId);
      }

      // Add AI response with message ID
      const aiMessage = {
        id: response.data.messageId, // Use the actual message ID from the response
        text: response.data.response,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle feedback submission
  const handleFeedback = async (messageId, isHelpful) => {
    try {
      await submitChatFeedback(messageId, isHelpful);
      // Update the message to show that feedback was submitted
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, feedbackSubmitted: true, isHelpful }
          : msg
      ));
    } catch (error) {
      console.error('Feedback error:', error);
      // In a real application, you might want to show an error message to the user
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-3 rounded-t-lg flex justify-between items-center">
        <h3 className="font-bold flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
              clipRule="evenodd"
            />
          </svg>
          AI Hỗ trợ
        </h3>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`mb-3 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-indigo-500 text-white rounded-br-none'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                }`}
              >
                <div className="text-sm">{message.text}</div>
                <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
                </div>
              </div>
            </div>
            {/* Add feedback buttons for AI messages */}
            {message.sender === 'ai' && !message.feedbackSubmitted && (
              <div className="mb-3 flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg rounded-bl-none px-3 py-2 max-w-xs lg:max-w-md">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleFeedback(message.id, true)} 
                      className="text-gray-400 hover:text-green-500"
                      title="Hữu ích"
                    >
                      👍
                    </button>
                    <button 
                      onClick={() => handleFeedback(message.id, false)} 
                      className="text-gray-400 hover:text-red-500"
                      title="Không hữu ích"
                    >
                      👎
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Show feedback confirmation for AI messages */}
            {message.sender === 'ai' && message.feedbackSubmitted && (
              <div className="mb-3 flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg rounded-bl-none px-3 py-2 max-w-xs lg:max-w-md">
                  <div className="text-xs">
                    {message.isHelpful ? 'Cảm ơn phản hồi tích cực! 👍' : 'Cảm ơn phản hồi, chúng tôi sẽ cải thiện! 👎'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="mb-3 flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg rounded-bl-none px-3 py-2 max-w-xs lg:max-w-md">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1 animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-3 rounded-r-lg hover:bg-indigo-700 transition-colors flex items-center ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
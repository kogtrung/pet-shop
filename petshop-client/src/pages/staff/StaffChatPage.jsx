import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../../api/chatApi';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

export default function StaffChatPage() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Xin chào! Tôi là trợ lý AI của PetShop. Tôi có thể giúp bạn tư vấn khách hàng về sản phẩm, cách chăm sóc thú cưng, hoặc bất kỳ câu hỏi nào liên quan.",
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

    useEffect(() => {
        const savedSessionId = localStorage.getItem('staffChatSessionId');
        if (savedSessionId) {
            setSessionId(savedSessionId);
        }
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        const userQuery = inputValue;
        setInputValue('');
        setIsLoading(true);

        try {
            const requestData = {
                query: userQuery,
                sessionId: sessionId
            };
            
            const response = await sendChatMessage(requestData);

            if (response.data.sessionId) {
                setSessionId(response.data.sessionId);
                localStorage.setItem('staffChatSessionId', response.data.sessionId);
            }

            const aiMessage = {
                id: response.data.messageId || Date.now(),
                text: response.data.response,
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat error:', error);
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

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tư vấn khách hàng</h1>
                <p className="text-gray-600 dark:text-gray-400">Sử dụng AI để hỗ trợ tư vấn khách hàng</p>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm h-[calc(100vh-250px)] flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                    message.sender === 'user'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                <p className="text-xs mt-1 opacity-70">
                                    {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2">
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
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Nhập câu hỏi để tư vấn khách hàng..."
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                                isLoading || !inputValue.trim()
                                    ? 'bg-gray-400 cursor-not-allowed text-white'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <PaperAirplaneIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



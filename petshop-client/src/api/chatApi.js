import apiClient from './apiClient';

/**
 * Chat API client
 * Handles AI chat functionality
 */

/**
 * Send a chat message to the AI
 * @param {Object} data - Chat data
 * @param {string} data.query - The user's question
 * @param {string} data.sessionId - The conversation session ID (optional)
 * @returns {Promise} API response with AI-generated answer and session ID
 */
export const sendChatMessage = (data) => apiClient.post('/api/chat/chat', data);

/**
 * Submit feedback for a chat message
 * @param {number} chatMessageId - The ID of the chat message
 * @param {boolean} isHelpful - Whether the message was helpful (true = 👍, false = 👎)
 * @returns {Promise} API response
 */
export const submitChatFeedback = (chatMessageId, isHelpful) => 
  apiClient.post('/api/chat/feedback', { chatMessageId, isHelpful });

/**
 * Fetch chat feedback report for admin
 * @returns {Promise} API response with feedback report data
 */
export const getChatFeedbackReport = async () => {
  const response = await apiClient.get('/api/chat/feedback');
  return response.data;
};

// Alias for consistency with other API functions
export const fetchChatResponse = sendChatMessage;
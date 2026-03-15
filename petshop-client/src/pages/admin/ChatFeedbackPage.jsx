import React, { useState, useEffect } from 'react';
import { getChatFeedbackReport } from '../../api/chatApi';

export default function ChatFeedbackPage() {
  const [report, setReport] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const data = await getChatFeedbackReport();
        setReport(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (isLoading) return <div className="p-4">Đang tải báo cáo...</div>;
  if (error) return <div className="p-4 text-red-500">Lỗi: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Báo cáo Feedback Chatbot</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border">Đánh giá</th>
              <th className="py-2 px-4 border">Câu hỏi của Khách</th>
              <th className="py-2 px-4 border">Câu trả lời của AI</th>
              <th className="py-2 px-4 border">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {report.map((item) => (
              <tr key={item.feedbackId} className="hover:bg-gray-50">
                <td className="py-2 px-4 border text-center">
                  <span className={`text-xl ${item.isHelpful ? 'text-green-500' : 'text-red-500'}`}>
                    {item.isHelpful ? '👍' : '👎'}
                  </span>
                </td>
                <td className="py-2 px-4 border text-sm">{item.userQuery}</td>
                <td className="py-2 px-4 border text-sm">{item.aiResponse}</td>
                <td className="py-2 px-4 border text-sm">
                  {new Date(item.feedbackCreatedAt).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
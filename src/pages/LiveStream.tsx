import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Stream {
  id: string;
  title: string;
  link: string;
  date: string; // e.g., "2025-11-12"
}

export default function LiveStreamPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Dummy data for demo
    const dummyData: Stream[] = [
      {
        id: "1",
        title: "Y.S. Jagan Mohan Reddy — Live Press Meet",
        link: "https://example.com/live1",
        date: new Date().toISOString().split("T")[0],
      },
      {
        id: "2",
        title: "YSRCP Development Highlights",
        link: "https://example.com/live2",
        date: "2025-10-10",
      },
      {
        id: "3",
        title: "NRI Wing Global Connect",
        link: "https://example.com/live3",
        date: "2025-10-05",
      },
    ];

    setStreams(dummyData);
    const today = new Date().toISOString().split("T")[0];
    const todayStream = dummyData.find((s) => s.date === today);
    setCurrentStream(todayStream || null);
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 🔙 Top Section with Back and Title */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-500 text-white px-4 py-2 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition duration-300"
        >
          ← Back
        </button>
        <h1 className="text-4xl font-bold text-center text-primary-600 flex-1">
          🎥 Live Stream
        </h1>
      </div>

      {/* 🔴 Current Live Stream */}
      {currentStream ? (
        <div className="mb-10 flex justify-center">
          <div className="relative w-full max-w-4xl h-[400px] bg-black rounded-xl overflow-hidden shadow-lg">
            {/* Overlay placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70">
              <div className="animate-pulse text-2xl font-semibold">
                🔴 {currentStream.title}
              </div>
              <p className="text-gray-300 mt-2">
                Live streaming content will appear here soon...
              </p>
            </div>

            {/* Hidden iframe placeholder */}
            <iframe
              className="w-full h-full opacity-0"
              src={currentStream.link}
              title={currentStream.title}
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 text-lg mb-10">
          No live stream today. Check out past sessions below.
        </p>
      )}

      {/* 🕒 Past Streams Section */}
      <h2 className="text-2xl font-bold text-center text-primary-600 mb-6">
        📺 Past Streams
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {streams
          .filter((s) => s.date !== new Date().toISOString().split("T")[0])
          .map((stream) => (
            <div
              key={stream.id}
              className="relative border border-gray-200 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* Placeholder overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white text-center p-4">
                <div className="animate-pulse text-lg font-semibold">
                  {stream.title}
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  Recorded stream – will be available soon
                </p>
              </div>

              <iframe
                className="w-full h-48 opacity-0"
                src={stream.link}
                title={stream.title}
                allowFullScreen
              />
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 text-center">
                  {stream.title}
                </h3>
                <p className="text-sm text-gray-500 text-center mt-1">
                  {stream.date}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";

interface Stream {
  id: string;
  title: string;
  link: string;
  date: string; // e.g., "2025-11-12"
}

export default function LiveStreamPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);

  useEffect(() => {
    fetch("https://your-api.com/streams") // ✅ your API endpoint
      .then((res) => res.json())
      .then((data) => {
        setStreams(data);

        const today = new Date().toISOString().split("T")[0];
        const todayStream = data.find((s: Stream) => s.date === today);
        setCurrentStream(todayStream || null);
      });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-center text-blue-600">
        Live Stream
      </h1>

      {/* 🎥 Current Live Stream */}
      {currentStream ? (
        <div className="mb-8 flex justify-center">
          <iframe
            className="rounded-lg shadow-lg w-full max-w-4xl h-[400px]"
            src={currentStream.link}
            title={currentStream.title}
            allowFullScreen
          />
        </div>
      ) : (
        <p className="text-center text-gray-500 text-lg">
          No live stream today. Check out past streams below.
        </p>
      )}

      {/* 🕒 Past Streams Section */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {streams
          .filter((s) => s.date !== new Date().toISOString().split("T")[0])
          .map((stream) => (
            <div
              key={stream.id}
              className="border border-gray-200 rounded-lg shadow hover:shadow-md transition p-4"
            >
              <iframe
                className="w-full h-48 rounded-md"
                src={stream.link}
                title={stream.title}
                allowFullScreen
              />
              <h2 className="mt-2 font-semibold text-center text-gray-700">
                {stream.title}
              </h2>
              <p className="text-sm text-gray-500 text-center">
                {stream.date}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

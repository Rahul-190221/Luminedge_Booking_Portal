"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mt-10 text-center">
          <p className="text-4xl bg-red-500 text-white p-5 w-[50%] mx-auto rounded-xl">
            Something went wrong!!!
          </p>
          <p className="text-4xl bg-red-500 text-white p-5 w-[50%] mx-auto rounded-xl mt-2">
            {error.message}
          </p>
          <button
            onClick={() => reset()}
            className="btn btn-error btn-outline mt-5"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
